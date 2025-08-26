'use client'

import React from 'react'
import { Button } from '@heroui/react'

import {
  SmsIcon,
  TelegramIcon,
  WhatsappIcon
} from '@/utils/icons'

interface ContactMethod {
  id: string
  label: string
  value: string
  connected: boolean
  Icon: React.ComponentType<{ className?: string }>
}
const contactMethods: ContactMethod[] = [
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

  return (
      <section className="bg-dark-gray light:bg-white shadow-lg flex flex-col items-start justify-center w-full rounded-lg mx-4 py-10 px-10 gap-10 max-w-4xl">
          <div className="flex items-start justify-center flex-col gap-4 w-full">
              <h2 className="text-left font-bold">How to Communicate</h2>
              <ul className="flex items-start justify-center flex-col text-[13px] mt-4 w-full">
                  {contactMethods.map(method => (
                      <div
                          key={method.id}
                          className="py-4 flex items-center justify-between w-full border-b-1 border-default-100"
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
              </ul>
          </div>
          <div className="flex items-start justify-center flex-col gap-4 mt-6 w-full">
              <h2 className="text-left font-bold">Push Notification</h2>
              <ul className="flex items-start justify-center flex-col text-[13px] mt-4 w-full">
                  {notificationEvents.map(evt => {
                      return (
                          <div
                              key={evt}
                              className="py-4 flex items-center justify-between w-full border-b-1 border-default-100"
                          >
                              <span className="text-white">{evt}</span>
                              <Button
                                  className="border border-white text-white hover:bg-white hover:text-black"
                                  size="sm"
                                  variant={'bordered'}
                              >
                                  Add
                              </Button>
                          </div>
                      )
                  })}
              </ul>
          </div>
    </section>
  )
}
