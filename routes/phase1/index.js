const express = require("express");

const campaigns = require("./campaigns");
const leads = require("./leads");
const tracking = require("./tracking");
const billing = require("./billing");

const router = express.Router();

router.use(campaigns);
router.use(leads);
router.use(tracking);
router.use(billing);

module.exports = router;
