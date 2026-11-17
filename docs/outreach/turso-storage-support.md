# Turso: storage still counted for deleted databases

A note for the maintainer to send to Turso support (support@turso.tech, or the chat in the Turso
dashboard). Nothing here is a key or a token.

## What we found (2026-11-04)

The "What Turso counts as storage" workflow (`tools/turso_storage.py`) read Turso's API:

- Turso counts **17,151,897,600 bytes** of storage for the organization `kingofhardts`. It reports
  the same number whether asked for October, for November, or for today alone.
- The four databases Turso lists hold **4,717,785,088 bytes** together: `rabai-library`
  4,529,446,912, `rabai-collection-aish` 163,655,680, `rabai-translations` 24,666,112 and
  `rabai-people` 16,384.
- That leaves **12,434,112,512 bytes** that belong to no database Turso lists. The difference
  was exactly the same on 16 October and 3 November.
- Turso lists no deleted databases or groups waiting to be restored.

Each rebuild of the library deletes the `rabai-library` database and creates a new one with the
same name, then uploads the new file (`tools/library_upload.py`). The deleted copies were 1,219 MB
and 1,219 MB (6 October), 4,061 MB and 4,064 MB (7 October), and 4,212 MB (11 October). The last
three add up to about 12.3 GB, which matches the gap. Turso still seems to count the storage of
those deleted databases. They aren't books we use; they no longer exist.

## Checked again (2026-11-17)

Still the same: Turso counts **17,175,318,528 bytes**, the four databases hold 4.74 GB, and the
unexplained part is still exactly **12,434,112,512 bytes**. Turso lists no deleted databases or
groups. The last library copy was deleted on 11 October, more than the 30 days Turso keeps
deleted databases for paid plans, so the storage is not going away on its own. Without it the
four databases would fit inside the plan's 9 GB, and there would be no storage overage at all
(today it is about 8.2 GB over, roughly $6 a month).

## The note to send

> Hello, our organization `kingofhardts` (Developer plan, overages on) shows 17.18 GB of storage
> in the usage API, but our four databases (rabai-library,
> rabai-collection-aish, rabai-translations, rabai-people) hold only about 4.72 GB together. The
> extra 12.43 GB has not changed since mid-October (checked again on 17 November) and is the same whether we ask the usage API
> for October, November or a single day. It matches the size of three databases we deleted on
> 7 and 11 October when we replaced `rabai-library` with a new upload (about 4.06, 4.06 and 4.21
> GB). No deleted databases are listed as restorable. Could you remove the storage still counted
> for those deleted databases, and correct the storage overage billed for October and November?
> Thank you.

## Until Turso fixes it

Every rebuild deletes one library copy and uploads another, so if Turso keeps counting deleted
databases, each rebuild adds about 4.5 GB that never goes away. Batch canon changes into as few
rebuilds as possible until Turso answers.
