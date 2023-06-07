# Photo lib

## Photo lib share

[Demo](https://dskr.photos/)

## Install

Clone repo:
```bash
git clone https://github.com/skrylnikov/photo-lib.git
cd photo-lib
```

Create config file:

```bash
nano docker-compose.prod.yml
```


```yaml
services:
  share-api:
    environment:
      - TG_BOT_TOKEN=<telegram bot token>
    volumes:
      - <path to folder or volume name>:/mnt/images:rw
```

Up containers:

```bash
docker compose -f share.yml -f share.prod.yml up --build -d
```

