const express = require("express");
const router = express.Router();
const db = require("./db");
const axios = require("axios");
const _ = require("lodash");

router.get("/", async (req, res) => {
  res.json({ api: "ok" });
});

router.get("/txs", async (req, res) => {
  const blockchain = req.query.blockchain;
  let data;
  if (blockchain) {
    const query =
      "select * from txs where blockchain = $1 order by height desc";
    data = (await db.query(query, [blockchain])).rows;
  } else {
    const query = "select * from txs order by height desc";
    data = (await db.query(query)).rows;
  }
  res.json(data);
});

router.get("/txs/ibc", async (req, res) => {
  let data = [];
  const txs = (await db.query("select * from txs")).rows;
  txs.forEach((tx) => {
    if (_.find(tx.events, { type: "send_packet" })) {
      data.push(tx);
    }
  });
  res.json(data);
});

router.get("/blockchains", async (req, res) => {
  const txs = (await db.query("select * from txs")).rows;
  const data = [...new Set(txs.map((tx) => tx.blockchain))];
  res.json(data);
});

router.get("/relations", async (req, res) => {
  let data = {};
  const txs = (await db.query("select * from txs")).rows;
  txs.forEach((tx) => {
    Object.keys(tx.events).forEach((i) => {
      const ev = tx.events[i];
      const sender = _.find(ev.attributes, { key: "sender" });
      if (ev.type === "message" && sender) {
        data[sender.val] = tx.blockchain;
      }
    });
  });
  res.json(data);
});

router.get("/health", async (req, res) => {
  const blockchain = req.query.blockchain;
  let data;
  try {
    data = (await axios.get(`http://${blockchain}:26657/health`)).data;
    res.send(data);
  } catch {
    data = null;
    res.sendStatus(404);
  }
});

module.exports = router;
