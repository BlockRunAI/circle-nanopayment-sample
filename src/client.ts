import 'dotenv/config'
import { GatewayClient } from '@circle-fin/x402-batching/client'

const privateKey = process.env.CLIENT_PRIVATE_KEY as `0x${string}`
if (!privateKey) { console.error('CLIENT_PRIVATE_KEY not set'); process.exit(1) }

const gateway = new GatewayClient({
  chain: 'arcTestnet',
  privateKey,
})

console.log(`Wallet: ${gateway.address}`)

// Check balances first
const balances = await gateway.getBalances()
console.log(`\nWallet USDC: ${balances.wallet.formatted}`)
console.log(`Gateway available: ${balances.gateway.formattedAvailable}`)
console.log(`Gateway total: ${balances.gateway.formattedTotal}\n`)

// If no Gateway balance, remind user to deposit
if (!balances.gateway.available || balances.gateway.available === 0n) {
  console.log('No Gateway balance. Run: npm run deposit -- <amount>')
  console.log('Example: npm run deposit -- 1')
  process.exit(1)
}

// Pay for the protected resource — handles full 402 flow automatically
const url = 'http://localhost:4021/risk-profile'
console.log(`Calling ${url} ...\n`)

try {
  const result = await gateway.pay(url)
  console.log('✅ Nanopayment complete!')
  console.log(`Paid: ${result.formattedAmount} USDC`)
  console.log(`Transaction: ${result.transaction}`)
  console.log(`Response:`)
  console.log(JSON.stringify(result.data, null, 2))
} catch (err: any) {
  console.error('❌ Payment failed:', err.message)
}
