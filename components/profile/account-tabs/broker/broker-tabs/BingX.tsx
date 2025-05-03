import Image from "next/image";

import TokenForm from "@/components/profile/account-tabs/broker/TokenForm";

export default function BingXTab() {

  return (
    <section className="flex flex-col items-center justify-center w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 justify-center w-1/4">
          <Image alt="binance" height={50} src="/images/icons/bingx.svg" width={40} />
          <span className="font-bold">BingX</span>
        </div>
        <div className="relative w-[600px] h-[420px]">
          <Image fill alt="binance" className="object-cover" src="/images/profile/binance-list.png" />
        </div>
      </div>
      <TokenForm type="okx" />
    </section>
  )
}
