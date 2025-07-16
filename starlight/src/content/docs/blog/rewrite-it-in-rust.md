---
title: Rewrite it in Rust
description: Analysis of some common low-level vulnerabilities, and whether and how Rust would have shielded the codebase from them.
date: 2024-07-27
lastUpdated: 2024-07-28
tags:
    - System Programming
    - Rust
excerpt: "This is a placeholder article to test my new blog's deployment"
authors:
    - winstonallo
cover:
  alt: A ferris crab standing on a pile of bodies waving a flag saying "Rewrite it in Rust!"
  image: ../../../../public/blog/rewrite-it-in-rust.jpg
---

```rust
fn main() -> std::io::Result<()> {
    fs::read_dir("/")?
        .map(|res| res.map(|e| {
            if e.path().contains(".c") {
                panic!("Are you out of your mind?");
            }
        }))
        .collect::Result<Vec<_>, io::Error>()?;
}
```
## Test LateX support

$$
|x,y| = \sqrt{x^2+y^2}
$$
