import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Inline SVG QR code. Content is generated locally from a string we control. */
export default function Qr({ text, size = 140 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toString(text, { type: 'svg', margin: 1, width: size, color: { dark: '#000000', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [text, size])
  return <span className="dk-qr" role="img" aria-label={`QR code for ${text}`} dangerouslySetInnerHTML={{ __html: svg }} />
}
