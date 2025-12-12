// deploys your app contracts
const TouristRegistry = artifacts.require("TouristRegistry");

module.exports = function (deployer) {
  deployer.deploy(TouristRegistry);
};
