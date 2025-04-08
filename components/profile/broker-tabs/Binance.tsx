import Image from "next/image";
import { Accordion, AccordionItem, Checkbox, Input } from "@heroui/react";
import { Button } from "@heroui/button";
import { FormEvent, useState } from "react";

import { ChevronLeftIcon } from "@/components/icons";
import { sendRequest } from "@/actions/post";

export default function BinanceTab() {

  const [formLoading, setFormLoading] = useState(false);

  async function handleSubmit (event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await sendRequest(formData, '/accounts/binance')
    console.log(response)
    setFormLoading(false);
  }

  return (
    <section className="flex flex-col items-center justify-center w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 justify-center w-1/4">
          <Image alt="binance" height={50} src="/images/icons/binance.png" width={40} />
          <span className="font-bold">Binance</span>
        </div>
        <div className="relative w-[600px] h-[420px]">
          <Image fill alt="binance" className="object-cover" src="/images/binance-list.png" />
        </div>
      </div>
      <form className="mt-16 flex items-center w-full gap-3 flex-wrap" onSubmit={handleSubmit}>
        <Input
          isRequired
          className="w-full lg:w-[49%]"
          classNames={{
            inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
          }}
          label="API Key"
          name="apiKey"
          type="text"
          variant="bordered"
        />
        <Input
          isRequired
          className="w-full lg:w-[49%]"
          classNames={{
            inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
          }}
          label="API Secret"
          name="secretKey"
          type="text"
          variant="bordered"
        />
        <Accordion
          defaultExpandedKeys={['permissions']}
        >
          <AccordionItem
            key="permissions"
            aria-label="Permissions"
            classNames={{
              trigger: 'w-auto'
            }}
            indicator={<ChevronLeftIcon />}
            title={
              <span className="font-bold">Permissions</span>
            }
          >
            <div className="flex items-center justify-between gap-5 flex-wrap">
              <Checkbox color="secondary" value="buenos-aires">Spot Trading</Checkbox>
              <Checkbox color="secondary" value="sydney">Perpetual Futures Trading</Checkbox>
              <Checkbox color="secondary" value="san-francisco">Universal Transfer</Checkbox>
              <Checkbox color="secondary" value="london">Manage Subaccounts </Checkbox>
              <Checkbox color="secondary" value="tokyo">P2P Trading</Checkbox>
            </div>
          </AccordionItem>
        </Accordion>
        <div className="flex w-full justify-end">
          <Button className="min-w-[100px]" color="primary" isLoading={formLoading} type="submit" variant="ghost">
            {!formLoading && <span>Connect</span>}
          </Button>
        </div>
      </form>
    </section>
  )
}
