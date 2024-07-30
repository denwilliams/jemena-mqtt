import assert from "node:assert";
import { readFileSync } from "node:fs";

import { create } from "mqtt-usvc";
import puppeteer from "puppeteer";
import csv from "csvtojson";

type Config = {
  poll_interval: number;
  jemena_username: string;
  jemena_password: string;
};

async function main() {
  const service = await create<Config>();

  const {
    poll_interval = 1800000,
    jemena_username,
    jemena_password,
  } = service.config;

  assert(jemena_username, "jemena_username is required");
  assert(jemena_password, "jemena_password is required");
  assert(poll_interval, "poll_interval is required");

  const handler = async () => {
    // borrowed from https://github.com/ryanseddon/jemena-powershop/blob/master/src/index.js
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const client = await page.createCDPSession();

    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: "./",
    });
    await page.goto("https://electricityoutlook.jemena.com.au/login/index");
    await page.type("input#login_email", jemena_username);
    await page.type("input#login_password", jemena_password);
    await page.click("#loginButton");

    //   await page.waitForNavigation();
    await page.waitForSelector("#refresh-data");
    //   await page.waitFor(5000);
    await page.click("#refresh-data");
    await page.waitForSelector("#fancybox-wrap", {
      hidden: true,
      timeout: 3000,
    });
    const usage = await page.evaluate(async () => {
      const res = await fetch(
        "https://electricityoutlook.jemena.com.au/electricityView/download",
        { credentials: "include" }
      );
      return await res.text();
    });

    const rows = await csv().fromString(usage);
    console.log(rows[0]);
    let latest = rows[rows.length - 1];
    //   console.log(latest);

    const keys = Object.keys(latest);
    if (keys[5] !== "00:00 - 00:30") {
      throw new Error("Expected 00:00 - 00:30 to be at index 5");
    }

    let latestValues = Object.values(latest);
    if (!latestValues[5]) {
      latestValues = Object.values(rows[rows.length - 2]);
    }

    const values = latestValues
      .slice(5)
      .filter((item) => !!item)
      .map(Number) as number[];

    const total = Number(values.reduce((sum, value) => sum + value, 0)).toFixed(
      2
    );
    const last = values.reduce((acc, value) => value || acc, 0);

    // TODO: emit balancec
    console.log("current total:", total);
    console.log("latest kw:", last);

    service.send("~/today", total); // total kwh for the day
    service.send("~/latest", last * 2); // convert to kw per hour

    await browser.close();
  };

  setInterval(handler, poll_interval);

  handler();
}

main()
  .then(() => {
    console.log("jemena-mqtt started.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
