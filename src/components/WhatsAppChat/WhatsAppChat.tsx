import { useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import { defaultWhatsAppMessage, whatsappChatUrl } from '../../utils/whatsapp'
import './WhatsAppChat.css'

interface Props {
  phone?: string
  businessName: string
  id?: string
}

function WhatsAppChat({ phone, businessName, id }: Props) {
  const [message, setMessage] = useState(() => defaultWhatsAppMessage(businessName))
  const url = phone ? whatsappChatUrl(phone, message) : null
  const fieldId = `whatsapp-msg-${id ?? phone ?? 'chat'}`

  if (!phone) return null

  return (
    <div className="whatsapp-chat">
      <label className="whatsapp-chat__label" htmlFor={fieldId}>
        {APP_STRINGS.whatsapp.messageLabel}
      </label>
      <textarea
        id={fieldId}
        className="whatsapp-chat__message"
        rows={3}
        value={message}
        placeholder={APP_STRINGS.whatsapp.messagePlaceholder}
        onChange={(e) => setMessage(e.target.value)}
      />
      {url ? (
        <a
          className="whatsapp-chat__button"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {APP_STRINGS.whatsapp.chat}
        </a>
      ) : (
        <p className="whatsapp-chat__hint">{APP_STRINGS.whatsapp.invalidPhone}</p>
      )}
    </div>
  )
}

export default WhatsAppChat
