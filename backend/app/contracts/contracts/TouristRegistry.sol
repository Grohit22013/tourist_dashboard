// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Migrations + TouristRegistry Combined
/// @notice Combined file containing both the Migrations helper contract and the TouristRegistry
///         (put this file in backend/app/contracts/contracts/CombinedContracts.sol)
//
/// NOTE: Keep your migration scripts unchanged:
///   migrations/1_initial_migration.js -> deploys Migrations
///   migrations/2_deploy_contracts.js  -> deploys TouristRegistry
// ------------------------------------------------------------------------

/*
 * Migrations helper (keeps Truffle migration state)
 */
contract Migrations {
    address public owner = msg.sender;
    uint public last_completed_migration;

    modifier restricted() {
        require(msg.sender == owner, "This function is restricted to the contract's owner");
        _;
    }

    function setCompleted(uint completed) public restricted {
        last_completed_migration = completed;
    }
}

// ------------------------------------------------------------------------
// TouristRegistry (your provided contract)
// ------------------------------------------------------------------------
contract TouristRegistry is AccessControl {
    // ------------------------
    // Role constants
    // ------------------------
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ------------------------
    // Legacy tourist struct (admin-only, not recommended for production)
    // ------------------------
    struct Tourist {
        string fullName;
        string kycId;
        string visitStart;
        string visitEnd;
        string emergencyContacts; // Stored as JSON or comma-separated
    }

    // ------------------------
    // Privacy-first attestation struct
    // ------------------------
    struct Attestation {
        bytes32 subjectHash; // keccak256 hash of DID, phone, or identifier
        string cid;          // IPFS CID of encrypted KYC blob
        uint256 timestamp;
        address issuer;      // Verifier who anchored this
        string meta;         // Small JSON metadata
    }

    // ------------------------
    // Storage
    // ------------------------
    mapping(address => Tourist) private tourists;            // Legacy mapping
    address[] private registeredTourists;                    // List of tourist addresses
    mapping(bytes32 => Attestation[]) private attestations;  // subjectHash => attestations

    // ------------------------
    // Events
    // ------------------------
    event TouristRegistered(
        address indexed touristAddress,
        string fullName,
        string kycId,
        string visitStart,
        string visitEnd,
        string emergencyContacts
    );

    event KycAnchored(
        bytes32 indexed subjectHash,
        string cid,
        address indexed issuer,
        uint256 indexed attestationId,
        uint256 timestamp,
        string meta
    );

    // ------------------------
    // Constructor
    // ------------------------
    constructor() {
        address adminAddr = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddr);
        _grantRole(VERIFIER_ROLE, adminAddr);
        _grantRole(EMERGENCY_ROLE, adminAddr);
    }

    // ------------------------
    // Legacy APIs (admin-only, on-chain PII storage)
    // ------------------------

    function registerTourist(
        string memory _fullName,
        string memory _kycId,
        string memory _visitStart,
        string memory _visitEnd,
        string memory _emergencyContacts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(tourists[msg.sender].fullName).length == 0, "Already registered");

        Tourist memory newTourist = Tourist({
            fullName: _fullName,
            kycId: _kycId,
            visitStart: _visitStart,
            visitEnd: _visitEnd,
            emergencyContacts: _emergencyContacts
        });

        tourists[msg.sender] = newTourist;
        registeredTourists.push(msg.sender);

        emit TouristRegistered(
            msg.sender,
            _fullName,
            _kycId,
            _visitStart,
            _visitEnd,
            _emergencyContacts
        );
    }

    function getTourist(address _touristAddress)
        external
        view
        returns (
            string memory fullName,
            string memory kycId,
            string memory visitStart,
            string memory visitEnd,
            string memory emergencyContacts
        )
    {
        Tourist memory t = tourists[_touristAddress];
        require(bytes(t.fullName).length > 0, "Tourist not found");
        return (t.fullName, t.kycId, t.visitStart, t.visitEnd, t.emergencyContacts);
    }

    function getAllRegisteredTourists() external view returns (address[] memory) {
        return registeredTourists;
    }

    // ------------------------
    // Privacy-first KYC attestation APIs
    // ------------------------

    function anchorKyc(
        bytes32 subjectHash,
        string calldata cid,
        string calldata meta
    )
        external
        onlyRole(VERIFIER_ROLE)
        returns (uint256 attestationId)
    {
        Attestation memory a = Attestation({
            subjectHash: subjectHash,
            cid: cid,
            timestamp: block.timestamp,
            issuer: _msgSender(),
            meta: meta
        });

        attestations[subjectHash].push(a);
        // attestationId is index in array: length - 1
        attestationId = attestations[subjectHash].length - 1;

        emit KycAnchored(subjectHash, cid, _msgSender(), attestationId, block.timestamp, meta);
    }

    function hasKyc(bytes32 subjectHash) external view returns (bool) {
        return attestations[subjectHash].length > 0;
    }

    function getLatestAttestation(bytes32 subjectHash)
        external
        view
        onlyRole(EMERGENCY_ROLE)
        returns (string memory cid, uint256 timestamp, address issuer, string memory meta)
    {
        require(attestations[subjectHash].length > 0, "No attestation");
        Attestation storage a = attestations[subjectHash][attestations[subjectHash].length - 1];
        return (a.cid, a.timestamp, a.issuer, a.meta);
    }

    function getAttestationByIndex(bytes32 subjectHash, uint256 index)
        external
        view
        onlyRole(VERIFIER_ROLE)
        returns (string memory cid, uint256 timestamp, address issuer, string memory meta)
    {
        require(index < attestations[subjectHash].length, "Index out of bounds");
        Attestation storage a = attestations[subjectHash][index];
        return (a.cid, a.timestamp, a.issuer, a.meta);
    }

    function attestationCount(bytes32 subjectHash) external view returns (uint256) {
        return attestations[subjectHash].length;
    }

    // ------------------------
    // Role Management Wrappers
    // ------------------------
    function grantVerifier(address who) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VERIFIER_ROLE, who);
    }

    function revokeVerifier(address who) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VERIFIER_ROLE, who);
    }

    function grantEmergencyResponder(address who) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(EMERGENCY_ROLE, who);
    }

    function revokeEmergencyResponder(address who) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(EMERGENCY_ROLE, who);
    }
}
