'use client'

import React, { useState } from 'react'
import Image from "next/image";
import { Button, Input } from '@heroui/react'

import {
  GmailIcon,
  SmsIcon,
  TelegramIcon,
  WhatsappIcon
} from '@/utils/icons'

interface NotificationCard {
  title: string
  description: string
}
const notificationCards: NotificationCard[] = [
  { title: 'How to communicate', description: 'Email, SMS, Telegram' },
  { title: 'Notification bot',  description: 'Price movement, Balance report, position open/close, risk alerts…' },
]

interface ContactMethod {
  id: string
  label: string
  value: string
  connected: boolean
  Icon: React.ComponentType<{ className?: string }>
}
const contactMethods: ContactMethod[] = [
  { id: 'email',    label: 'Email',    value: 'you@example.com',   connected: true,  Icon: GmailIcon     },
  { id: 'sms',      label: 'SMS',      value: '+49 123 456 7890', connected: false, Icon: SmsIcon       },
  { id: 'telegram', label: 'Telegram', value: '@yourHandle',      connected: false, Icon: TelegramIcon  },
  { id: 'whatsapp', label: 'WhatsApp', value: '@yourWhatsApp',    connected: false, Icon: WhatsappIcon  },
]

const notificationEvents = [
  'Price movement',
  'Balance report',
  'Open position bot status',
  'Close position bot status',
  'Risk limit alerts',
  'Trading strategies',
  'Market conditions'
]

export default function NotificationSettings() {
  // -1 = none; 0 = “How to communicate”; 1 = “Notification bot”
  const [selectedCard, setSelectedCard] = useState<number>(-1)

  // which events are currently added
  const [chosenEvents, setChosenEvents] =
    useState<Set<string>>(new Set(['Price movement']))

  // subscription-email state
  const [newsletterEmail, setNewsletterEmail] = useState('')

  const toggleEvent = (evt: string) => {
    setChosenEvents(prev => {
      const next = new Set(prev)

      next.has(evt) ? next.delete(evt) : next.add(evt)

      return next
    })
  }

  return (
    <section className="mt-16 px-4 lg:px-16">
      <h2 className="text-white text-2xl font-semibold mb-4">Notification</h2>
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8">
        {/* LEFT: selection cards */}
        <div className="flex-1 lg:w-96 space-y-4">
          {notificationCards.map((card, i) => {
            const active = i === selectedCard

            return (
              <button
                key={card.title}
                className={`
                  cursor-pointer rounded-lg p-4 transition-all duration-300 w-full flex flex-col items-start
                  ${active
                  ? 'border-1 border-primary bg-transparent'
                  : 'border border-white/20 bg-white/10 backdrop-blur-md'
                }
                `}
                onClick={() => setSelectedCard(i)}
              >
                <h3 className="text-white text-lg font-medium">
                  {card.title}
                </h3>
                <p className="text-gray-400 mt-1 text-sm line-clamp-1 text-start">
                  {card.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* RIGHT: content depending on selection */}
        <div className="flex-1 space-y-4">
          {/* none selected => show QR + newsletter */}
          {selectedCard === -1 && (
            <div className="space-y-4 flex flex-col items-center justify-center">
              <div className="flex justify-center w-48 h-48 relative items-center">
                <Image
                  fill
                  alt="Subscribe QR"
                  src="/images/profile/Qrcode.png"
                />
              </div>
              <p className="text-center text-white">Subscribe to latest news!</p>
              <Input
                className="max-w-md mx-auto"
                label="Email"
                value={newsletterEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewsletterEmail(e.target.value)
                }
              />
            </div>
          )}

          {/* “How to communicate” */}
          {selectedCard === 0 && contactMethods.map(method => (
            <div
              key={method.id}
              className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <method.Icon className="w-6 h-6 text-white" />
                <div>
                  <div className="text-white font-medium">
                    {method.label}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {method.value}
                  </div>
                </div>
              </div>
              <Button
                className={
                  method.connected
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'border border-white text-white hover:bg-white hover:text-black'
                }
                size="sm"
                variant={method.connected ? 'solid' : 'bordered'}
              >
                {method.connected ? 'connected' : 'connect'}
              </Button>
            </div>
          ))}

          {/* “Notification bot” */}
          {selectedCard === 1 && notificationEvents.map(evt => {
            const added = chosenEvents.has(evt)

            return (
              <div
                key={evt}
                className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <span className="text-white">{evt}</span>
                <Button
                  className={
                    added
                      ? 'bg-white text-black hover:bg-gray-100'
                      : 'border border-white text-white hover:bg-white hover:text-black'
                  }
                  size="sm"
                  variant={added ? 'solid' : 'bordered'}
                  onPress={() => toggleEvent(evt)}
                >
                  {added ? 'Remove' : 'Add'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
