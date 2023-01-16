const {expect} = require("chai");
const {network, ethers} = require("hardhat");
const {developmentChains} = require("../../helper-hardhat-config");
const {BigNumber, utils} = require("ethers");

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

async function encodeData(contract, functionName, args) {
  const func = contract.interface.getFunction(functionName);
  return contract.interface.encodeFunctionData(func, args);
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Race12 unit tests", function () {
      let signer,
        tokenV1,
        tokenV2,
        vault,
        permitModule,
        verifySignature,
        totalSupply,
        funtionSelector,
        migratorRole,
        depositAmount,
        deadline;

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

        const FuntionSelector = await ethers.getContractFactory("FuntionSelector");
        funtionSelector = await FuntionSelector.deploy();

        depositAmount = 100;
        deadline = ethers.constants.MaxUint256;

        migratorRole = utils.keccak256(utils.toUtf8Bytes("MIGRATOR_ROLE"));
      });

      describe("Token V1 callbacks", function () {
        it("Confirms admin roles", async () => {
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
          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, depositAmount, deadline);

          // Token V1s fallback is invoked
          // Caller is not migrator so delegateCall isn't executed
          // Execution continues and reverts as Vault isn't approved for Underlying Token transfers

          await expect(
            vault.depositWithPermit(signer.address, depositAmount, deadline, v, r, s, vault.address)
          ).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it("Invokes TokenV1 fallback, admin approved", async () => {
          // Grant vault Migrator role
          await tokenV1.grantRole(migratorRole, vault.address);
          expect(await tokenV1.hasRole(migratorRole, vault.address)).to.eq(true);

          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, depositAmount, deadline);

          // tokenV1 is not exposed to Permit approval, so deposits with Permit will fail
          await expect(
            vault.depositWithPermit(signer.address, depositAmount, deadline, v, r, s, user1.address)
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

          // balances
          expect(await tokenV1.balanceOf(vault.address)).to.eq(0);
          expect(await tokenV1.balanceOf(signer.address)).to.eq(1000);
          expect(await vault.balanceOf(user1.address)).to.eq(0);

          // Invoke T2 fallback, in turn invokes T1 fallback to delegatecall back
          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, depositAmount, deadline);
          const tx = await vault.depositWithPermit(signer.address, depositAmount, deadline, v, r, s, user1.address);

          // balances after depositWithPermit
          expect(await tokenV1.balanceOf(vault.address)).to.eq(depositAmount);
          expect(await tokenV1.balanceOf(signer.address)).to.eq(900);
          expect(await vault.balanceOf(user1.address)).to.eq(depositAmount);

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

          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, depositAmount, deadline);

          async function depositWithPermit(target, depositAmount, deadline, v, r, s, to) {
            const data = encodeData(Vault, "depositWithPermit", [target, depositAmount, deadline, v, r, s, to]);
            return signer.sendTransaction({
              to: vault.address,
              data: data,
              gasLimit: 300000,
            });
          }
          await depositWithPermit(signer.address, depositAmount, deadline, v, r, s, user1.address);
        });
      });

      describe("Validates function data", async () => {
        it("Validates function parameters", async () => {
          const Vault = await ethers.getContractFactory("VaultV1");
          vault = await Vault.deploy(tokenV2.address);
          await vault.deployed();

          // grant Migrator _Role to TokenV2, to expose fallback functions
          await tokenV1.grantRole(migratorRole, tokenV2.address);

          const {v, r, s} = await getPermitSignature(signer, tokenV1, vault.address, depositAmount, deadline);

          async function depositWithPermit(target, depositAmount, deadline, v, r, s, to) {
            const data = encodeData(Vault, "depositWithPermit", [target, depositAmount, deadline, v, r, s, to]);
            return data;
          }
          let data = await depositWithPermit(signer.address, depositAmount, deadline, v, r, s, user1.address);

          //0x81a37c18000000000000000000000000// - function selector
          //f39fd6e51aad88f6f4ce6ab8827279cfffb92266//   - sending address
          //0000000000000000000000000000000000000000000000000000000000000064//  - depositAmount
          //ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff//   - deadline
          //000000000000000000000000000000000000000000000000000000000000001 // v
          //b62d23473e2bb6aa1c8e3338da1590778aee73124c8d4c173b5816dd652cd9103 // r
          //892dae01546a67f7a4b9ff849fdc9ae9eb2b102b87939c8422d9b0ae2b5e58a00 // s
          //000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8 //  - receiving address

          // function selector
          const selector = data.slice(0, 10);
          expect(selector).to.eq(
            await funtionSelector.getSelector(
              "depositWithPermit(address,uint256,uint256,uint8,bytes32,bytes32,address)"
            )
          );
          // sending address
          const senderAddress = data.slice(34, 74);
          const adr = signer.address.toLowerCase();
          expect(senderAddress).to.eq(adr.slice(2, 42));

          // depositAmount
          const depositAmountBytes = data.slice(74, 138);
          expect(parseInt(depositAmountBytes, 16)).to.eq(depositAmount);

          // deadline
          const deadlineBytes = data.slice(140, 202);
          let deadlineTruncate = utils.hexZeroPad(BigNumber.from(deadline).toHexString(), 32);
          expect(deadlineBytes).to.eq(deadlineTruncate.slice(2, 64));

          // v, r, s
          const vBytes = data.slice(204, 266);
          expect(parseInt(vBytes, 16)).to.eq(v);

          const rBytes = data.slice(266, 330);
          expect(rBytes).to.eq(r.slice(2, 66));

          const sBytes = data.slice(330, 394);
          expect(sBytes).to.eq(s.slice(2, 66));

          // receiver address
          const receiverAddress = data.slice(418, 460);
          const to = user1.address.toLowerCase();
          expect(receiverAddress).to.eq(to.slice(2, 42));

          // The function selector has to match "depositWithPermit(address,uint256,uint256,uint8,bytes32,bytes32,address)" to successfully delegateCalls
          // Calling the fallback directly won't match the selector and inevitably fail
          // Therefore we require a contract with depositWithPermit, in this case the Vault contract
        });
      });
    });
