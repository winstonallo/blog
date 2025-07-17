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

impl String {
    pub fn length(&self) -> usize {
        self.len
    }
}
```
## What is a _C_ String?
Text is nothing but an array of bytes. If you want to access text, simply store a pointer to its first byte, and start reading from there. The challenge arises when trying to figure out _how many_ bytes to read.

In the early days of Unix development, there were two popular solutions to this problem:
1. Using a _leading byte_ to store the length of the string. This allowed the string to contain any data, but limited its length to 255 bytes. This is known as a _length-prefixed string_.
2. Marking the end of the string with a null-byte (the value $0$). This poses no limitations on the length of the string, but reserves `\0` as a delimiter.

A solution that immediately comes to mind would be to just use more bytes to store the length. This would be very similar to the basic implementation shown above. However, back when C was first drafted, memory was limited. Using up additional memory to store the length of a string was very unattractive.

Dennis Ritchie, the man who designed C, went with the second approach, in order to avoid limiting and maintaining strings' lengths.

This approach has many issues. Forgetting to allocate size for the null-byte, or forgetting to write it, will result in some nasty undefined behavior. Having a null-byte in the middle of a string will truncate it. This choice was famously referred to as the [most expensive one-byte mistake](https://queue.acm.org/detail.cfm?id=2010365) by Poul-Henning Kamp, a FreeBSD developer.

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
```plaintext
Naive Approach: 568.59 ms
libc: 52.06 ms
```
We're about 10 times slower than `libc`. Let's try to figure out why!
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

- Compiler: Ubuntu clang version 18.1.3, x86_64-pc-linux-gnu, full optimization level (`-O3`)
- Hardware: Virtualized AMD EPYC 9634 (1 allocated core, ~2.25 GHz)
- OS: Ubuntu 24.04.2 LTS
- libc version: 2.39-0ubuntu8.5

Results may vary on different hardware and environments.
## Faster Approach
The issue with the naive approach is that we are iterating over the string byte by byte, and comparing each of them with $0$. This is bad for a few reasons:
## SIMD GO BRRRR
