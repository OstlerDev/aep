const CryptoJS = require('crypto-js')
const bitcoin = require('bitcoinjs-lib')
const flovault = require('./flovault')
const callbackify = require('callbackify')
const Key = require('./key')
const networks = require('../coins/networks')

function Wallet (identifier, password, defaultCrypto) {
  if (!(this instanceof Wallet)) {
    console.warn('Non constructor call made to Wallet.constructor')
    return new Wallet(...arguments)
  }

  this.identifier = identifier || ''
  this.password = password || ''
  this.defaultCrypto = defaultCrypto || 'florincoin'
  this.cryptoConfig = {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126,
    iterations: 5
  }
  this.sharedKey = ''
  this.keys = []
}

Wallet.prototype.load = callbackify(function () {
  if (this.sharedKey !== '') {
    let err = new Error('Wallet already loaded')
    return Promise.reject(err)
  }

  return flovault.checkLoad(this.identifier).then((res) => {
    if (res.encryption_settings.algo === 'aes') {
      this.cryptoConfig = {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Iso10126
      }
      this.cryptoConfig.iterations = res.encryption_settings.iterations
    } else {
      let err = new Error('Unsupported wallet encryption')
      return Promise.reject(err)
    }

    if (res.gauth_enabled === true) {
      if (res.auth_key_isvalid !== true) {
        let err = new Error('2FA wallets not supported... yet')
        return Promise.reject(err)
      }
    }

    return flovault.load(this.identifier).then((res) => {
      if (res.error === false) {
        let dec = decryptWallet(res.wallet, this.password, this.cryptoConfig)

        if (!dec) {
          return Promise.reject(new Error('Unable to decrypt wallet'))
        }

        this.sharedKey = dec.shared_key

        if (Array.isArray(dec.keys)) {
          this.keys = hydrateKeys(dec.keys)
        } else {
          this.keys = addressesToKeys(dec.addresses)
        }
      }
    })
  })
})

Wallet.prototype.store = callbackify(function () {
  let encryptedWallet = encryptWallet(this)

  if (!encryptedWallet) {
    return Promise.reject(new Error('Unable to encrypt wallet'))
  }

  let data = {
    identifier: this.identifier,
    shared_key: this.sharedKey,
    wallet_data: encryptedWallet
  }

  return flovault.store(data)
})

Wallet.prototype.payTo = callbackify.variadic(function (fromAddress, toAddress, amount, fee, txComment) {
  let key, coinName
  for (let k of this.keys) {
    let name = k.getNameFromAddress(fromAddress)
    if (name !== '') {
      key = k
      coinName = name
    }
  }
  if (key === undefined) {
    return Promise.reject(new Error('No key found for address ' + fromAddress))
  }

  return key.payTo(coinName, toAddress, amount, fee, txComment)
})

Wallet.prototype.refreshBalances = callbackify(function () {
  let p = []

  for (let key of this.keys) {
    p.push(key.refreshBalance())
  }

  return Promise.all(p)
})

Wallet.prototype.refreshUnspent = callbackify(function () {
  let p = []

  for (let key of this.keys) {
    p.push(key.refreshUnspent())
  }

  return Promise.all(p)
})

Wallet.prototype.refresh = callbackify(function () {
  return Promise.all([this.refreshBalances(), this.refreshUnspent()])
})

function decryptWallet (wallet, password, cryptoConfig) {
  try {
    let bytes = CryptoJS.AES.decrypt(wallet, password, cryptoConfig)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  } catch (e) {
    return false
  }
}

function encryptWallet (wallet) {
  try {
    let bytes = CryptoJS.AES.encrypt(JSON.stringify(wallet), wallet.password, wallet.cryptoConfig)
    return bytes.toString()
  } catch (e) {
    return false
  }
}

function addressesToKeys (addresses) {
  let keys = []
  for (let addrStr in addresses) {
    if (addresses.hasOwnProperty(addrStr)) {
      let addr = addresses[addrStr]
      let k = new Key(addr.priv)

      networks.listSupportedCoins().forEach((coinName) => {
        k.addCoin(coinName)
      })

      keys.push(k)
    }
  }
  return keys
}

function hydrateKeys (dryKeys) {
  let keys = []

  for (let dk of dryKeys) {
    keys.push(new Key(dk))
  }

  return keys
}

Wallet.prototype.toJSON = function () {
  return {
    shared_key: this.sharedKey,
    keys: this.keys
  }
}

Wallet.prototype.newAddress = function (coinName) {
  if (!networks.isSupported(coinName)) {
    return ''
  }

  let net = networks.getNetwork(coinName)
  let keyPair = bitcoin.ECPair.makeRandom({network: net})
  let k = new Key(keyPair.toWIF(), coinName)

  this.keys.push(k)

  return keyPair.getAddress()
}

Wallet.prototype.listAddresses = function (coinName) {
  let addresses = []

  for (let k of this.keys) {
    if (k.hasCoin(coinName)) {
      addresses.push(k.getAddress(coinName))
    }
  }

  return addresses
}

Wallet.prototype.signMessgage = function (address, message) {
  for (let k of this.keys) {
    if (k.containsAddress(address)) {
      return k.signMessage(address, message)
    }
  }
  return ''
}

Wallet.prototype.verifyMessage = function (address, message, signature) {
  for (let k of this.keys) {
    if (k.containsAddress(address)) {
      return k.verifyMessage(address, message, signature)
    }
  }
  return false
}

module.exports = Wallet
