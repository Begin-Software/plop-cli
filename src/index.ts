#!/usr/bin/env bun

import { login } from "./auth";
import { upload } from "./upload";
import { del } from "./delete";
import { claim } from "./claim";
import { addDomain, removeDomain, listDomains } from "./domains";

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "login":
    await login();
    break;

  case "upload":
    if (!args[0]) {
      console.error("Usage: plop upload <file> [alias]");
      process.exit(1);
    }
    await upload(args[0], args[1] || undefined);
    break;

  case "delete":
    if (!args[0]) {
      console.error("Usage: plop delete <id|id.ext>");
      process.exit(1);
    }
    await del(args[0]);
    break;

  case "claim":
    if (!args[0]) {
      console.error("Usage: plop claim <username>");
      process.exit(1);
    }
    await claim(args[0]);
    break;

  case "domains":
    if (args[0] === "add" && args[1]) {
      await addDomain(args[1]);
    } else if (args[0] === "remove" && args[1]) {
      await removeDomain(args[1]);
    } else if (!args[0] || args[0] === "list") {
      await listDomains();
    } else {
      console.error("Usage: plop domains [list|add <hostname>|remove <hostname>]");
      process.exit(1);
    }
    break;

  case "version":
    console.log("plop 0.1.0");
    break;

  default:
    console.log("Usage: plop <login|upload|delete|claim|domains|version>");
    process.exit(cmd ? 1 : 0);
}
