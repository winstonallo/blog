---
title: Deep-Dive Into strlen
description: A deep dive into the `strlen` function from glibc
date: 2025-07-16
lastUpdated: 2025-07-16
tags:
    - System Programming
    - C
    - Undefined Behavior
    - libc
authors:
    - winstonallo
cover:
  alt: A screenshot of the Unix manual entry for the libc function strlen.
  image: ../../../../public/blog/man-strlen.jpeg
---
When first starting to code, I built my own version of some libc functions in order to understand them better. I remember comparing my implementations to the original ones, and wondering how they could be _this much_ faster.

One particular function that really bugged me was `strlen`. All I did was iterate from the start address to the `NULL`-byte - what could possibly be faster than that?

I looked at the `glibc` implementation with a friend, but I quickly gave up on understanding it once I encountered magic numbers and bitwise operations I had never seen before.

A little over a year later, I came back, stronger than ever and ready to spend the little time I had left between work, studies, and personal projects understanding why my `strlen` implementation sucked.
## What is a String?
Representing text is a very common use case in programming. In most languages, the string is a first-class citizen in the type system. It is usually represented along with its size, allowing you to get its length using some variation of this approach:
```rust
let s = "Hello, World!";
let len = s.length();
```
The implementation for the string type usually boils down to something like this:
```rust
struct String {
    bytes: Vec<u8>, // Vector of bytes to store the characters
    len: usize,     // Length of the string
}
```
## What is a _C_ String?
C (among others) follows a more simplistic principle. Text is nothing but an array of bytes. If you want to access text, simply store the address of its first byte, and start reading from there. Simple, right?

However, the issues start arising when trying to figure out _how many_ bytes to read. In the early days of Unix development, there were two popular solutions to this problem:
1. Using two _leading bytes_ to store the length of the string. This allowed the string to contain any data, but limited its length to 65536 bytes. This is known as a _length-prefixed string_, or _Pascal String_.
2. Marking the end of the string with a null-byte (the value $0$). This poses no limitations on the length of the string, but reserves `\0` as a delimiter.

A solution that immediately comes to mind would be to just use more bytes to store the length. This would be very similar to the basic implementation shown above. However, back when C was first drafted, memory was limited. Using up additional memory to store the length of a string was very unattractive.

Dennis Ritchie, the man who designed C, went with the second approach, in order to avoid limiting and maintaining strings' lengths.

This approach has many issues. Forget to allocate size for the null-byte, or forget to set it, and you will read out of bounds. Put a null-byte in the middle of a string, and it will be truncated. This choice was famously referred to as the [most expensive one-byte mistake](https://queue.acm.org/detail.cfm?id=2010365) by Poul-Henning Kamp, a FreeBSD developer.

No matter how much it should not be the case, this is still a choice we must live with when coding in C. Let's have a look at the `strlen` algorithm, and _how we can make it go brrrr_.
## Definition of `strlen`
Let $M$ represent our memory, a sequence of bytes.

Each byte is an element of the set of all bytes values, i.e, ${0,1,2,...,255}$, where $0$ represents a null-byte.

Each byte can be denoted as $M_i$, where $i$ is the index into memory.

We can define $strlen$ as follows:
$$
strlen(addr) = max\{n\ \epsilon\ \{0, ..., \infty\}\ |\ M_{addr + i} \ne 0 for\ all\ i\ \epsilon\{0,1,...,n-1\}\}
$$

In other words, we need to count the number of bytes, starting from $M_{addr}$, stopping when the first null-byte is encountered.
## Naive Approach
Let's start with the most intuitive approach. We can just initialize some counter $i$ to $0$, start at $M_{addr}$, and check each byte $M_{addr + i}$. This would look something like this:
```c
size_t strlen(const char* str) {
    size_t i = 0;

    while (str[i] != 0) {
        i++;
    }

    return i;
}
```
This should work! Let's benchmark it against `libc`'s take on the same algorithm!
### Benchmarking
If you want to reproduce this, here is the (very simple) benchmarking program I wrote:
```c
double
get_time_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec * 1000.0 + (double)ts.tv_nsec / 1000000.0;
}

int
main() {
    const long len = 1000000000;
    char *str = calloc(len, 1);
    memset(str, '1', len - 2);

    double start, end;

    start = get_time_ms();
    strlen_naive(str);
    end = get_time_ms();
    printf("Naive Approach: %.2f ms\n", end - start);

    start = get_time_ms();
    size_t x = strlen(str);
    end = get_time_ms();
    printf("libc: %.2f ms\n", end - start);
    return x == len; // -O3 removes the call to strlen unless the result is used
}
```
This allocates a null-terminated string with one billion bytes, and times both the naive implementation and the `libc` version.

* Compiler: Ubuntu clang version 18.1.3, x86_64-pc-linux-gnu
* Compiler flags: `-O3 -fno-builtin`
* Hardware: Virtualized AMD EPYC 9634 (1 allocated core, ~2.25 GHz)
* OS: Ubuntu 24.04.2 LTS
* libc version: 2.39-0ubuntu8.5

Results will vary on different hardware and environments.

Here are the results of our simple benchmark:
```plaintext
Naive Approach: 568.59 ms
libc: 52.06 ms
```
We're about 10 times slower than `libc`. Let's try to figure out why!
## Why doesn't the compiler fix my code??
A typical way for compilers to improve one-byte-at-a-time loops is vectorization. For processing loops with explicit boundaries,
like in `memcpy`, it can safely adapt to the boundary and process more bytes in each iteration. 
With `strlen` however, the compiler does not know where the string ends, and it cannot vectorize those operations safely
without potentially reading past valid memory.

This means we're on our own here! The best thing the compiler can do at this point is recognize that we are using an unoptimized version of `strlen` and replace it with
the built-in one - which is why we use the `-fno-builtin` flag when compiling our benchmark code.

## Faster Approach
The issue with this naive approach is that we are iterating over the string byte by byte, when modern CPUs can handle larger chunks efficiently.

The idea is: instead of checking each byte individually, we can read entire words (8 bytes on 64-bit systems) and use bit manipulation to detect if any of those 8 bytes contains a zero. In theory, this should make our implementation
8 times faster.

### But wait - Isn't this dangerous?
Technically, yes! In C, reading beyond the bounds of an allocated object is undefined behavior according to the language standard. However, the reality on x86/x86-64 systems is more nuanced,
and this is exactly what allows optimized `strlen` implementations to work.

The key idea is that **aligned memory accesses cannot cross page boundaries**.
1. Memory protection operates on page boundaries (4KB).
2. An aligned 8-byte load will never span across two pages, meaning that if _any_ byte in the load is valid, the _entire load is safe_.

Let me give you an example: if you have a string at address `0x1000` (page-aligned), and it's only 3 bytes long, reading 8 bytes starting from `0x1000` is safe because:
* All 8 bytes are within the same 4KB page
* The operating system allocated that entire page to **your** program
* The other bytes after your string are just uninitialized memory within your page



## SIMD GO BRRRR
