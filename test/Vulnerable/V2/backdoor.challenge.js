const {ethers} = require("hardhat");
const {expect} = require("chai");
const {AddressZero} = require("@ethersproject/constants");

const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const IERC20 = new ethers.utils.Interface(JSON.stringify(ERC20.abi));

describe("[Challenge] Backdoor", function () {
  let deployer, users, attacker;

  const AMOUNT_TOKENS_DISTRIBUTED = ethers.utils.parseEther("40");

  beforeEach(async function () {
    /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
    [deployer, alice, bob, charlie, david, attacker] = await ethers.getSigners();
    users = [alice.address, bob.address, charlie.address, david.address];

    // Deploy Gnosis Safe master copy and factory contracts
    this.masterCopy = await (await ethers.getContractFactory("GnosisSafe", deployer)).deploy();
    this.walletFactory = await (await ethers.getContractFactory("GnosisSafeProxyFactory", deployer)).deploy();
    this.token = await (await ethers.getContractFactory("DamnValuableToken", deployer)).deploy();

    // Deploy the registry
    this.walletRegistry = await (
      await ethers.getContractFactory("WalletRegistry", deployer)
    ).deploy(this.masterCopy.address, this.walletFactory.address, this.token.address, users);

    this.walletRegistryAttack = await (
      await ethers.getContractFactory("WalletRegistryAttack", deployer)
    ).deploy(this.masterCopy.address, this.walletFactory.address, this.walletRegistry.address, this.token.address);

    this.walletRegistryAttack2 = await (
      await ethers.getContractFactory("WalletRegistryAttack2", deployer)
    ).deploy(this.masterCopy.address, this.walletFactory.address, this.walletRegistry.address, this.token.address);

    // Users are registered as beneficiaries
    for (let i = 0; i < users.length; i++) {
      expect(await this.walletRegistry.beneficiaries(users[i])).to.be.true;
    }

    // Transfer tokens to be distributed to the registry
    await this.token.transfer(this.walletRegistry.address, AMOUNT_TOKENS_DISTRIBUTED);
  });

  describe("create proxy", function () {
    it("should revert with invalid singleton address'", async function () {
      await expect(this.walletFactory.createProxy(AddressZero, "0x")).to.be.revertedWith(
        "Invalid singleton address provided"
      );
    });

    it("should revert with invalid initializer", async function () {
      await expect(this.walletFactory.createProxy(this.walletFactory.address, "0x42baddad")).to.be.reverted;
    });

    it("emits a ProxyCreation event", async function () {
      const factoryNonce = await ethers.provider.getTransactionCount(this.walletFactory.address);
      const proxyAddress = ethers.utils.getContractAddress({from: this.walletFactory.address, nonce: factoryNonce});

      await expect(this.walletFactory.createProxy(this.walletFactory.address, "0x"))
        .to.emit(this.walletFactory, "ProxyCreation")
        .withArgs(proxyAddress, this.walletFactory.address);
    });
  });

  describe("createProxyWithCallback", function () {
    it("emits a ProxyCreation event with WalletRegistry callback'", async function () {
      await this.walletRegistryAttack.execute(users, attacker.address);
    });
  });

  describe("createProxyWithCallback", function () {
    it("uses fallback handler", async function () {
      await this.walletRegistryAttack2.execute(users, attacker.address);
    });
  });

  /** CODE YOUR EXPLOIT HERE */
  // create proxy

  after(async function () {
    /** SUCCESS CONDITIONS */
    for (let i = 0; i < users.length; i++) {
      let wallet = await this.walletRegistry.wallets(users[i]);

      // User must have registered a wallet
      expect(wallet).to.not.eq(ethers.constants.AddressZero, "User did not register a wallet");

      //User is no longer registered as a beneficiary
      expect(await this.walletRegistry.beneficiaries(users[i])).to.be.false;
    }

    // Attacker must have taken all tokens
    expect(await this.token.balanceOf(attacker.address)).to.eq(AMOUNT_TOKENS_DISTRIBUTED);
  });
});
