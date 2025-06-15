const express = require('express')
const puppeteer = require('puppeteer')
const cors = require('cors')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.json())

async function enviarWhatsApp(numero, mensagem) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  try {
    await page.goto('https://web.whatsapp.com')
    await page.waitForSelector('[data-testid="chat-list"]', { timeout: 60000 })

    await page.click('[data-testid="chat-list-search"]')
    await page.type('[data-testid="chat-list-search"]', numero)
    await page.waitForTimeout(2000)

    await page.click('[data-testid="cell-frame-container"]:first-child')
    await page.waitForSelector('[data-testid="conversation-compose-box-input"]')

    await page.type('[data-testid="conversation-compose-box-input"]', mensagem)
    await page.click('[data-testid="compose-btn-send"]')

    return { sucesso: true }
  } catch (erro) {
    return { sucesso: false, erro: erro.message }
  } finally {
    await browser.close()
  }
}

app.post('/api/enviar-mensagem', async (req, res) => {
  const { numero, mensagem, mensagemId } = req.body

  const resultado = await enviarWhatsApp(numero, mensagem)

  await fetch('https://seu-webhook-url.com/webhook/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mensagemId,
      status: resultado.sucesso ? 'enviada' : 'erro',
      timestamp: new Date().toISOString(),
      errorMessage: resultado.erro || null
    })
  })

  res.json(resultado)
})

app.post('/webhook/status', async (req, res) => {
  const { mensagemId, status, timestamp, errorMessage } = req.body

  console.log(`[WEBHOOK] Status atualizado:`, {
    mensagemId,
    status,
    timestamp,
    errorMessage
  })

  res.status(200).json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})