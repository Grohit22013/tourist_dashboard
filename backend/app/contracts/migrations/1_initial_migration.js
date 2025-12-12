// deploys the Migrations helper contract (Truffle bookkeeping)
const Migrations = artifacts.require("Migrations");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
