import React, { useState } from "react";
import { Input } from '@heroui/react'

const notifications = [
  {
    title: 'How to communicate',
    description: 'Email, SMS, Telegram',
  },
  {
    title: 'Notification bot',
    description: 'Price movement, Balance report, open position bot …',
  },
]

export default function NotificationSection() {

  const [email, setEmail] = useState('')

  return (
    <section className="mt-16 px-4 lg:px-16">
      <h2 className="text-white text-2xl font-semibold mb-6">Notification</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side: Notification cards */}
        <div>
          <div className="space-y-4">
            {notifications.map((note) => (
              <div
                key={note.title}
                className="bg-white/10 backdrop-blur-md rounded-lg p-4"
              >
                <h3 className="text-white text-lg font-medium">
                  {note.title}
                </h3>
                <p className="text-gray-400 mt-1 text-sm">
                  {note.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: QR code + subscribe form */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-2 mb-4">
            <img
              src="/images/profile/Qrcode.png"
              alt="Scan to subscribe"
              className="w-32 h-32 object-cover"
            />
          </div>
          <p className="text-white mb-2">Subscribe to latest news!</p>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-xs bg-white/10 backdrop-blur-md rounded-xl text-white focus:ring-2 transition"
          />
        </div>
      </div>
    </section>
  )
}
