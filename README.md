# Telegram RPI Locator BOT

## About

Many thnks to https://rpilocator.com/ for doing the hard work of finding available stock. Please donate them a coffee if you find this bot useful.

This bot allows you configure filters for the RSS feed from https://rpilocator.com/. It saves it's configration in an sqlite database called ```sqlite3.db```. Devices, Regions and Vendors can be adjusted in the config.json. The RSS feed is read once per minute. Please do not make more calls than that. See https://rpilocator.com/about.cfm

NOTE: I wiped this up in a few hours. The code is a mess and not something you should use as a reference for anything nor should you use it in production.

## Example

I have this bot running at https://t.me/rpilocating_bot . Feel free to use it but it may have bugs.

## Run / Install

This code should run in Node 10 and above.

```bash
git clone <this repo>
cd <git folder>
npm install
cp .env.dist .env
# set your bot token in .env
node index.js # start bot
```

To auto run the bot under Debian see rpilocator.service in helper/debian folder