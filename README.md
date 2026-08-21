# Photo lib

## Photo library

[Demo](https://dskr.photos/)

## Install

Clone repo:
```bash
git clone https://github.com/skrylnikov/photo-lib.git
cd photo-lib
```

Create a private deployment override from `example.env` and configure Pocket ID
and RustFS credentials. SQLite metadata lives in a persistent volume; cache and
temporary media volumes are disposable.

```bash
nano share.prod.yml
```


Up containers:

```bash
docker compose -f share.yml -f share.prod.yml up --build -d
```
