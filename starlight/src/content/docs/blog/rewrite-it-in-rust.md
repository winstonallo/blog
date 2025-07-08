---
title: Rewrite it in Rust
description: Analysis of some common low-level vulnerabilities, and whether and how Rust would have shielded the codebase from them.
date: 2024-07-27
lastUpdated: 2024-07-28
tags:
    - System Programming
    - Rust
excerpt: Continuing to improve our k3s cluster and especially the CI/CD workflow, we now take a look at the GitOps tool called Argo CD, and how we can integrate it into our cluster. Our tech stack for deployment uses these services&#58; k3s, Helm, Cilium & after this tutorial Argo CD as well
authors:
    - winstonallo
cover:
  alt: A beautiful cover image with the text "Argo CD"
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
