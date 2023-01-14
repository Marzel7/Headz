const {assert, expect, AssertionError} = require("chai");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains} = require("../../helper-hardhat-config");
const {BigNumber, utils} = require("ethers");
const {
  fromWei,
  contractBalance,
  contractCode,
  getBytePackedVar,
  getArrayItem,
  getUint256,
  getMappingItem,
  toWei,
} = require("../../helpers/helpers.js");
const {deploy} = require("@openzeppelin/hardhat-upgrades/dist/utils");
const {TASK_DEPLOY} = require("hardhat-deploy");
const {makeValidateUpgrade} = require("@openzeppelin/hardhat-upgrades/dist/validate-upgrade");
const {keccak256, toUtf8CodePoints} = require("ethers/lib/utils");

async function getPermitSignature(signer, token, spender, value, deadline) {
  const [nonce, name, version, chainId] = await Promise.all([
    0, //token.nonces(signer.address),
    token.name(),
    "1",
    signer.getChainId(),
  ]);

  return ethers.utils.splitSignature(
    await signer._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
      }
    )
  );
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Race12 unit tests", function () {
      let mastercopy,
        proxy,
        signer,
        acc1,
        acc2,
        tokenV1,
        tokenV2,
        vault,
        permitModule,
        verifySignature,
        verifier,
        totalSupply,
        migratorRole;

      // temp values from remix
      const r = "0x71e4794c81c2014ec8ebabe5d17107e8f0ae62f87d6d2059cda8bdb4aa498ef1";
      const s = "0x44a70d2d2caeb2cc9a4704dfd58900db6e75633eb0b78787670cb93e5ce946d7";
      const v = 27;

      beforeEach(async () => {
        totalSupply = 1000;
        [signer, user1, user2] = await ethers.getSigners();

        const TokenV1 = await ethers.getContractFactory("TokenV1");
        tokenV1 = await TokenV1.deploy();

        const TokenV2 = await ethers.getContractFactory("TokenV2");
        tokenV2 = await TokenV2.deploy(tokenV1.address);

        const Vault = await ethers.getContractFactory("VaultV1");
        vault = await Vault.deploy(tokenV1.address);

        const PermitModule = await ethers.getContractFactory("PermitModule");
        permitModule = await PermitModule.deploy();

        const VerifySignature = await ethers.getContractFactory("VerifySignatureP");
        verifySignature = await VerifySignature.deploy();

        migratorRole = utils.keccak256(utils.toUtf8Bytes("MIGRATOR_ROLE"));
      });

      describe("Token V1 callbacks", function () {
        it("Confirms admin roles", async () => {
          // await verifySignature.getMessageHash();
          let adminRole = await tokenV1.DEFAULT_ADMIN_ROLE();
          // signer has admin role
          expect(await tokenV1.hasRole(adminRole, signer.address)).to.eq(true);
          // vault not asigned admin role
          expect(await tokenV1.hasRole(adminRole, vault.address)).to.eq(false);
        });
        // No address exists, returns ZERO address
        it("TokenV1 deployment", async () => {
          // Vault deployed with TokenV1 as UNDERLYING
          expect(await vault.UNDERLYING()).to.eq(tokenV1.address);
          expect(await tokenV1.totalSupply()).to.eq(totalSupply);
        });

        it("Invokes TokenV1 fallback, not admin approved", async () => {
          // Token V1s fallback is invoked
          // Caller is not migrator so delegateCall isn't executed
          // Execution continues and reverts as Vault isn't approved for Underlying Token transfers
          await expect(vault.depositWithPermit(signer.address, 10, 100, v, r, s, vault.address)).to.be.revertedWith(
            "ERC20: insufficient allowance"
          );
        });

        it("Invokes TokenV1 fallback, admin approved", async () => {
          // Grant vault Migrator role
          await tokenV1.grantRole(migratorRole, vault.address);
          expect(await tokenV1.hasRole(migratorRole, vault.address)).to.eq(true);
          const amount = 100;
          const deadline = ethers.constants.MaxUint256;
          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, amount, deadline);
          // tokenV1 is not exposed to Permit approval, so deposits with Permit will fail
          await expect(
            vault.depositWithPermit(signer.address, amount, deadline, v, r, s, user1.address)
          ).to.be.revertedWith("MIGRATION CALL FAILED");
        });
      });

      describe("Vault deployed with Token V2", async () => {
        it("T1 invokes T2 fallback, T1 delegatecalls back to invoke PermitModule", async () => {
          const Vault = await ethers.getContractFactory("VaultV1");
          vault = await Vault.deploy(tokenV2.address);
          await vault.deployed();

          // TokenV1 is underlying
          expect(await vault.UNDERLYING()).to.eq(tokenV2.address);

          // grant Migrator _Role to TokenV2, to expose fallback functions
          await tokenV1.grantRole(migratorRole, tokenV2.address);

          const amount = 100;
          const deadline = ethers.constants.MaxUint256;

          // balances
          expect(await tokenV1.balanceOf(vault.address)).to.eq(0);
          expect(await tokenV1.balanceOf(signer.address)).to.eq(1000);
          expect(await vault.balanceOf(user1.address)).to.eq(0);

          // Invoke T2 fallback, in turn invokes T1 fallback to delegatecall back
          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, amount, deadline);
          const tx = await vault.depositWithPermit(signer.address, amount, deadline, v, r, s, user1.address);

          // balances after depositWithPermit
          expect(await tokenV1.balanceOf(vault.address)).to.eq(100);
          expect(await tokenV1.balanceOf(signer.address)).to.eq(900);
          expect(await vault.balanceOf(user1.address)).to.eq(100);

          // TokenV1 is still underlying, calls are delegated to PermitModule
          // by abusing fallback functions
          expect(await vault.UNDERLYING()).to.eq(tokenV2.address);
        });

        it("Vault deployed with Token V2, using encoded data", async () => {
          const Vault = await ethers.getContractFactory("VaultV1");
          vault = await Vault.deploy(tokenV2.address);
          await vault.deployed();

          // grant Migrator _Role to TokenV2, to expose fallback functions
          await tokenV1.grantRole(migratorRole, tokenV2.address);

          const amount = 100;
          const deadline = ethers.constants.MaxUint256;
          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, amount, deadline);

          function encodeData(contract, functionName, args) {
            const func = contract.interface.getFunction(functionName);
            return contract.interface.encodeFunctionData(func, args);
          }
          async function depositWithPermit(target, amount, deadline, v, r, s, to) {
            const data = encodeData(Vault, "depositWithPermit", [target, amount, deadline, v, r, s, to]);
            return signer.sendTransaction({
              to: vault.address,
              data: data,
              gasLimit: 300000,
            });
          }
          await depositWithPermit(signer.address, amount, deadline, v, r, s, user1.address);
        });
      });
    });
