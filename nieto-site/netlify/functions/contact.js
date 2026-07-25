exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Parse body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  // Validate required fields
  const { name, email, phone, service, message } = data;
  
  if (!name || !email || !message) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Campos obrigatórios: nome, e-mail e mensagem' 
      })
    };
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'E-mail inválido' })
    };
  }

  // Log the contact (in production, integrate with email/WhatsApp/CRM)
  const contact = {
    name,
    email,
    phone: phone || '',
    service: service || '',
    message,
    timestamp: new Date().toISOString(),
    ip: event.headers['x-forwarded-for'] || event.headers['x-nf-client-connection-ip'] || 'unknown'
  };

  console.log('📧 Novo contato Niero:', contact);

  // TODO: Integrate with your preferred notification method:
  // - SendGrid / Mailgun / Nodemailer for email
  // - WhatsApp Business API
  // - Google Sheets / Airtable / Notion API
  // - Slack / Discord webhook
  // - CRM (HubSpot, Pipedrive, etc.)

  // Example: Log for now (replace with actual integration)
  /*
  // Example with SendGrid:
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to: 'contato@niero.com.br',
    from: 'contato@niero.com.br',
    subject: `Novo contato: ${name} - ${service || 'Geral'}`,
    text: `Nome: ${name}\nE-mail: ${email}\nTelefone: ${phone}\nServiço: ${service}\nMensagem: ${message}`,
    html: `<p><strong>Nome:</strong> ${name}</p><p><strong>E-mail:</strong> ${email}</p><p><strong>Telefone:</strong> ${phone}</p><p><strong>Serviço:</strong> ${service}</p><p><strong>Mensagem:</strong> ${message}</p>`
  });
  */

  // Success response
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({ 
      success: true, 
      message: 'Mensagem enviada com sucesso! Retornaremos em até 24h úteis.' 
    })
  };
};