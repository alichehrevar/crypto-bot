'use client'

import { Suspense } from 'react'

import TabsList from "@/components/profile/account-tabs/TabsList";

export default function SettingsPage () {

  return (
    <Suspense fallback={<div>Loading settings…</div>}>
      <TabsList />
    </Suspense>
  )
}
