const path = require("path");

module.exports = {
  contracts_build_directory: path.join(__dirname, "build", "contracts"),
  contracts_directory: path.join(__dirname, "contracts"),

  networks: {
    // Ganache inside Docker
    docker_ganache: {
      host: "127.0.0.1",   // You run truffle on host → map through port binding
      port: 8545,          // forwarded in docker-compose.yml (ganache:8545 -> host:8545)
      network_id: "*",     // match any
      // from: "0x90F8bf6A..."  // optional, better to let Ganache pick default
    },

    // For Ganache CLI you might run locally without Docker
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    }
  },

  compilers: {
    solc: {
      version: "0.8.21"
    }
  }
};
