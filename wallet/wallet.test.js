const CryptoJS = require('crypto-js')
const bcrypto = require('bitcoinjs-lib').crypto

const Wallet = require('./wallet')
const Insight = require('../coins/explorers/insight')
//jest.mock('../coins/explorers/insight') -- Mock for Wallet.payTo test

test('wallet constructor', () => {
  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')
  expect(wal.identifier).toBe('75c1209-dbcac5a6-e040977-64a52ae')
  expect(wal.password).toBe('PublicDevAccount')
})

test('wallet load promise', () => {
  expect.assertions(4)

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  return wal.load().then(() => {
    expect(wal.identifier).toBe('75c1209-dbcac5a6-e040977-64a52ae')
    expect(wal.password).toBe('PublicDevAccount')
    expect(wal.defaultCrypto).toBe('florincoin')
    expect(wal.cryptoConfig).toEqual({
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Iso10126,
      iterations: 5
    })
  })
})

test('wallet load callback', (done) => {
  expect.assertions(4)

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  wal.load(() => {
    expect(wal.identifier).toBe('75c1209-dbcac5a6-e040977-64a52ae')
    expect(wal.password).toBe('PublicDevAccount')
    expect(wal.defaultCrypto).toBe('florincoin')
    expect(wal.cryptoConfig).toEqual({
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Iso10126,
      iterations: 5
    })
    done()
  })
})

test('wallet refresh balance promise', () => {
  jest.setTimeout(30 * 1000)
  expect.assertions(2)

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  return wal.load().then(() => {
    return wal.refreshBalances().then(() => {
      expect(wal).toBeDefined()
      expect(wal.keys[0].coins['florincoin'].balanceSat).toBe(899600000)
    })
  })
})

test('wallet refresh balance callback', (done) => {
  jest.setTimeout(30 * 1000)
  expect.assertions(1)

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  wal.load(() => {
    wal.refreshBalances(() => {
      expect(wal.keys[0].coins['florincoin'].balanceSat).toBe(899600000)
      done()
    })
  })
})

test('wallet refresh promise', () => {
  jest.setTimeout(60 * 1000)
  expect.assertions(4)

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  return wal.load().then(() => {
    return wal.refresh().then(() => {
      expect(wal.keys[0].getBalanceSat('florincoin')).toBe(899600000)
      expect(wal.keys[0].getBalanceSat('bitcoin_testnet')).toBe(53926225)
      expect(wal.keys[0].getUTXO('florincoin')).toEqual([{
        'address': 'FDEAciuFexEHy1kiLKRt34e2PybTyhdGZC',
        'amount': 8.996,
        'confirmations': 6,
        'confirmationsFromCache': true,
        'scriptPubKey': '76a9145125148dc7f01494071bfe3bf3afc7c612e0bd5388ac',
        'ts': 1510069808,
        'txid': 'cdf9581d413286dc1c6ccb7d2b0ca105879c29932364668d579ed2621dffe60a',
        'vout': 1
      }])
      expect(wal.keys[0].getUTXO('bitcoin_testnet')).toEqual([
        {
          "address": "mnv1SyZ9cfSt7xMJCCk6tbKpEKBA5gBknL",
          "txid": "d1699bd8dd12b2a5e96d922ee3845dd00e0e8a122ff9d5e94f16fd0d411c2e70",
          "vout": 1,
          "scriptPubKey": "76a9145125148dc7f01494071bfe3bf3afc7c612e0bd5388ac",
          "amount": 0.53926225,
          "satoshis": 53926225,
          "height": 1225853,
          "confirmations": 1
        }
      ])
    })
  })
})

test('wallet refresh callback', (done) => {
  jest.setTimeout(60 * 1000)
  expect.assertions(2)

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  return wal.load(() => {
    return wal.refresh(() => {
      expect(wal.keys[0].getBalanceSat('florincoin')).toBe(899600000)
      expect(wal.keys[0].getUTXO('florincoin')).toEqual([{
        'address': 'FDEAciuFexEHy1kiLKRt34e2PybTyhdGZC',
        'amount': 8.996,
        'confirmations': 6,
        'confirmationsFromCache': true,
        'scriptPubKey': '76a9145125148dc7f01494071bfe3bf3afc7c612e0bd5388ac',
        'ts': 1510069808,
        'txid': 'cdf9581d413286dc1c6ccb7d2b0ca105879c29932364668d579ed2621dffe60a',
        'vout': 1
      }])
      done()
    })
  })
})

test.skip('wallet payto', () => {
  // Requires Insight mocking, which breaks other tests
  Insight.prototype.getUnspent.mockImplementation((addr) => {
    switch (addr) {
      case 'FDEAciuFexEHy1kiLKRt34e2PybTyhdGZC':
        return Promise.resolve({
          data: [{
            'address': 'FDEAciuFexEHy1kiLKRt34e2PybTyhdGZC',
            'amount': 9.997,
            'confirmations': 6,
            'confirmationsFromCache': true,
            'scriptPubKey': '76a9145125148dc7f01494071bfe3bf3afc7c612e0bd5388ac',
            'ts': 1508836658,
            'txid': '02c85b5cacecfeede339bb7874f250c7731d986c727283ee0c91cf5c96e52b11',
            'vout': 1
          }]
        })
      case 'FD42dYEYLfsdr88ukVZ9Pf3rDYs75McM7s':
        return Promise.resolve({data: []})
    }
    return Promise.resolve({data: []})
  })

  Insight.prototype.getBalance.mockImplementation((addr) => {
    switch (addr) {
      case 'FDEAciuFexEHy1kiLKRt34e2PybTyhdGZC':
        return Promise.resolve({data: {balanceSat: 999700000}})
      case 'FD42dYEYLfsdr88ukVZ9Pf3rDYs75McM7s':
        return Promise.resolve({data: {balanceSat: 0}})
    }
    return Promise.resolve({data: {balanceSat: 1}})
  })

  Insight.prototype.pushTX.mockImplementation((tx) => {
    return Promise.resolve({data: bcrypto.hash256(Buffer.from(tx, 'hex')).reverse().toString('hex')})
  })

  jest.setTimeout(60 * 1000)
  expect.hasAssertions()

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  return wal.load().then(() => {
    return wal.refresh().then(() => {
      return wal.keys[0].payTo('florincoin', 'FD42dYEYLfsdr88ukVZ9Pf3rDYs75McM7s', 1, 'yolo swag').then((res) => {
        expect(res.data).toBe('cdf9581d413286dc1c6ccb7d2b0ca105879c29932364668d579ed2621dffe60a')
      })
    })
  })
})

test.skip('wallet payto testnet', () => {
  // Skipped test as it won't work without mocking utxo's and balances
  jest.setTimeout(60 * 1000)
  expect.hasAssertions()

  let wal = new Wallet('75c1209-dbcac5a6-e040977-64a52ae', 'PublicDevAccount')

  return wal.load().then(() => {
    return wal.refresh().then(() => {
      return wal.keys[0].payTo('bitcoin_testnet', 'mnjsTntSJP6E14jVcNsNFBje3tSo7y4pGi', 0.5).then((res) => {
        expect(res.data).toBe('d1699bd8dd12b2a5e96d922ee3845dd00e0e8a122ff9d5e94f16fd0d411c2e70')
      })
    })
  })
})