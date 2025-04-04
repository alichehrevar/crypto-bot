import Image from "next/image";

export default function SideBar() {
  return (
    <div className="dark:bg-black shadow-default light:bg-white shadow-2xl rounded-tr-3xl rounded-br-3xl flex flex-col items-center justify-start h-full w-full">
      <div className="flex items-center justify-center w-4/5 h-[140px] relative">
        <Image
          fill
          alt="tradingx"
          className="object-contain object-center"
          src="/images/logos/logo.png"
        />
      </div>
    </div>
  )
}
