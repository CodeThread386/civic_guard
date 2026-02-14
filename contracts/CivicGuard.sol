// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CivicGuard
 * @dev Blockchain-based document verification and issuing platform
 * Stores document hashes with user and verifier address identifiers
 *
 * Document hash algorithm: SHA-256 (client-side before upload)
 * publicKeyHash: keccak256 of wallet address (used as user/verifier identifier)
 */
contract CivicGuard {
    // ============ Structs ============
    struct User {
        address walletAddress;
        bytes32 publicKeyHash;  // keccak256 of user's public key
        bool isVerifier;
        bool exists;
    }

    struct DocumentRecord {
        bytes32 documentHash;
        bytes32 userPubKeyHash;
        bytes32 verifierPubKeyHash;
        string documentType;
        uint256 timestamp;
    }

    // ============ State Variables ============
    address public owner;
    address public defaultVerifierNode;
    bytes32 public defaultVerifierPubKeyHash;

    mapping(address => User) public users;
    mapping(bytes32 => User) public usersByPubKeyHash;
    mapping(bytes32 => DocumentRecord[]) public userDocuments;  // userPubKeyHash => documents
    mapping(bytes32 => bool) public documentExists;  // documentHash => exists

    // Document types each verifier can issue
    mapping(bytes32 => string[]) public verifierDocumentTypes;  // verifierPubKeyHash => document types

    // ============ Events ============
    event UserRegistered(address indexed walletAddress, bytes32 indexed pubKeyHash, bool isVerifier);
    event DocumentRecorded(
        bytes32 indexed documentHash,
        bytes32 indexed userPubKeyHash,
        bytes32 indexed verifierPubKeyHash,
        string documentType
    );
    event VerifierNodeSet(address indexed verifierAddress, bytes32 pubKeyHash);

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    // ============ Constructor ============
    constructor(bytes32 _defaultVerifierPubKeyHash) {
        owner = msg.sender;
        defaultVerifierNode = msg.sender;
        defaultVerifierPubKeyHash = _defaultVerifierPubKeyHash;

        // Register default verifier
        users[msg.sender] = User({
            walletAddress: msg.sender,
            publicKeyHash: _defaultVerifierPubKeyHash,
            isVerifier: true,
            exists: true
        });
        usersByPubKeyHash[_defaultVerifierPubKeyHash] = users[msg.sender];

        // Default verifier can issue these document types
        verifierDocumentTypes[_defaultVerifierPubKeyHash] = [
            "Aadhar",
            "PAN",
            "Degree",
            "Passport",
            "Driving License"
        ];

        emit VerifierNodeSet(msg.sender, _defaultVerifierPubKeyHash);
        emit UserRegistered(msg.sender, _defaultVerifierPubKeyHash, true);
    }

    // ============ User Registration ============
    /**
     * @dev Register a new user on the blockchain
     * @param _pubKeyHash keccak256 hash of the user's public key
     * @param _isVerifier whether the user is a verifier
     */
    function registerUser(bytes32 _pubKeyHash, bool _isVerifier) external {
        require(!users[msg.sender].exists, "User already registered");
        require(!usersByPubKeyHash[_pubKeyHash].exists, "Public key already registered");

        users[msg.sender] = User({
            walletAddress: msg.sender,
            publicKeyHash: _pubKeyHash,
            isVerifier: _isVerifier,
            exists: true
        });
        usersByPubKeyHash[_pubKeyHash] = users[msg.sender];

        emit UserRegistered(msg.sender, _pubKeyHash, _isVerifier);
    }

    // ============ Document Recording ============
    /**
     * @dev Record a document hash on the blockchain
     * @param _documentHash SHA-256 or Keccak256 hash of the document
     * @param _userPubKeyHash Hash of the user's public key
     * @param _verifierPubKeyHash Hash of the verifier's public key
     * @param _documentType Type of document (e.g., Aadhar, PAN)
     */
    function recordDocument(
        bytes32 _documentHash,
        bytes32 _userPubKeyHash,
        bytes32 _verifierPubKeyHash,
        string calldata _documentType
    ) external {
        require(users[msg.sender].exists, "Caller not registered");
        require(users[msg.sender].isVerifier, "Only verifiers can record documents");
        require(
            users[msg.sender].publicKeyHash == _verifierPubKeyHash,
            "Verifier pub key mismatch"
        );
        require(usersByPubKeyHash[_userPubKeyHash].exists, "User not registered");
        require(!documentExists[_documentHash], "Document already recorded");

        userDocuments[_userPubKeyHash].push(DocumentRecord({
            documentHash: _documentHash,
            userPubKeyHash: _userPubKeyHash,
            verifierPubKeyHash: _verifierPubKeyHash,
            documentType: _documentType,
            timestamp: block.timestamp
        }));

        documentExists[_documentHash] = true;

        emit DocumentRecorded(_documentHash, _userPubKeyHash, _verifierPubKeyHash, _documentType);
    }

    /**
     * @dev Alternative: User submits document record (after verifier approval off-chain)
     * Verifier must have approved - we trust the frontend flow
     * In production, consider a 2-step commit-reveal or verifier signature
     */
    function recordDocumentAsUser(
        bytes32 _documentHash,
        bytes32 _verifierPubKeyHash,
        string calldata _documentType
    ) external {
        require(users[msg.sender].exists, "User not registered");
        require(!users[msg.sender].isVerifier, "Verifiers use recordDocument");
        require(!documentExists[_documentHash], "Document already recorded");

        bytes32 userPubKeyHash = users[msg.sender].publicKeyHash;

        userDocuments[userPubKeyHash].push(DocumentRecord({
            documentHash: _documentHash,
            userPubKeyHash: userPubKeyHash,
            verifierPubKeyHash: _verifierPubKeyHash,
            documentType: _documentType,
            timestamp: block.timestamp
        }));

        documentExists[_documentHash] = true;

        emit DocumentRecorded(_documentHash, userPubKeyHash, _verifierPubKeyHash, _documentType);
    }

    // ============ View Functions ============
    /**
     * @dev Check if user exists by wallet address
     */
    function userExists(address _address) external view returns (bool) {
        return users[_address].exists;
    }

    /**
     * @dev Check if user exists by public key hash
     */
    function userExistsByPubKey(bytes32 _pubKeyHash) external view returns (bool) {
        return usersByPubKeyHash[_pubKeyHash].exists;
    }

    /**
     * @dev Get all document types for a user (by their pub key hash)
     */
    function getUserDocumentTypes(bytes32 _userPubKeyHash) external view returns (string[] memory) {
        DocumentRecord[] memory docs = userDocuments[_userPubKeyHash];
        string[] memory types = new string[](docs.length);
        for (uint256 i = 0; i < docs.length; i++) {
            types[i] = docs[i].documentType;
        }
        return types;
    }

    /**
     * @dev Get document count for a user
     */
    function getUserDocumentCount(bytes32 _userPubKeyHash) external view returns (uint256) {
        return userDocuments[_userPubKeyHash].length;
    }

    /**
     * @dev Get document types a verifier can issue
     */
    function getVerifierDocumentTypes(bytes32 _verifierPubKeyHash) external view returns (string[] memory) {
        return verifierDocumentTypes[_verifierPubKeyHash];
    }

    /**
     * @dev Get default verifier's public key hash
     */
    function getDefaultVerifierPubKeyHash() external view returns (bytes32) {
        return defaultVerifierPubKeyHash;
    }
}
