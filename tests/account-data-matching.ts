import * as anchor from "@coral-xyz/anchor";
import * as token from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { AccountDataMatching } from "../target/types/account_data_matching";
import { expect } from "chai";

describe("account-data-matching", () => {
    let provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = provider.connection;
    
    const program = anchor.workspace.AccountDataMatching as Program<AccountDataMatching>;
    
    
    const wallet: anchor.Wallet = anchor.workspace.AccountDataMatching.provider.wallet;
    
    const walletFake = anchor.web3.Keypair.generate();

    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    );

    const [tokenPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("token")],
        program.programId
    );

    let mint: anchor.web3.PublicKey;
    let withdrawDestination: anchor.web3.PublicKey;;
    let fakeWithdrawDestination: anchor.web3.PublicKey;

    before(async () => {
        mint = await token.createMint(
            connection,
            wallet.payer,
            wallet.publicKey,
            null,
            0
        );

        withdrawDestination = await token.createAccount(
            connection,
            wallet.payer,
            mint,
            wallet.publicKey
        );

        fakeWithdrawDestination = await token.createAccount(
            connection,
            wallet.payer,
            mint,
            walletFake.publicKey
        );

        await connection.confirmTransaction(
            await connection.requestAirdrop(
                walletFake.publicKey,
                1 * anchor.web3.LAMPORTS_PER_SOL
            ),
            "confirmed"
        );
    })

    it("initializes vault", async () => {
        await program.methods
            .initializeVault()
            .accounts({
                vault: vaultPDA,
                tokenAccount: tokenPDA,
                withdrawDestination,
                mint,
                authority: wallet.publicKey
            })
            .rpc()

        await token.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenPDA,
            wallet.payer,
            100
        )

        const balance = await connection.getTokenAccountBalance(tokenPDA);
        expect(balance.value.uiAmount).to.eq(100);
    })

    // it("insecure withdraw", async () => {
    //     const tx = await program.methods
    //         .insecureWithdraw()
    //         .accounts({
    //             vault: vaultPDA,
    //             tokenAccount: tokenPDA,
    //             withdrawDestination: fakeWithdrawDestination,
    //             authority: walletFake.publicKey,
    //         })
    //         .transaction();

    //     await anchor.web3.sendAndConfirmTransaction(
    //         connection,
    //         tx,
    //         [walletFake]
    //     );

    //     const balanceVault = await connection.getTokenAccountBalance(tokenPDA);
    //     expect(balanceVault.value.uiAmount).to.eq(0);
    //     const balanceFake = await connection.getTokenAccountBalance(fakeWithdrawDestination);
    //     expect(balanceFake.value.uiAmount).to.eq(100)
    // })

    it("secure withdraw", async () => {
        try {
            const tx = await program.methods
                .secureWithdraw()
                .accounts({
                    vault: vaultPDA,
                    tokenAccount: tokenPDA,
                    withdrawDestination: fakeWithdrawDestination,
                    authority: walletFake.publicKey,
                })
                .transaction();
    
            await anchor.web3.sendAndConfirmTransaction(
                connection,
                tx,
                [walletFake]
            );
        } catch(e) {
            expect(e)
            console.log(e)
        }
    })
    
});
