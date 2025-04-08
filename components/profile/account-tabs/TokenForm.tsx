import { Accordion, AccordionItem, addToast, Checkbox, Input } from "@heroui/react";
import { Button } from "@heroui/button";
import { FormEvent, useState } from "react";

import { ChevronLeftIcon } from "@/components/icons";
import { TokenFormType } from "@/types/profile/settings/tokenFormType";
import { sendRequest } from "@/actions/post";

export default function TokenForm(props: {type: 'binance' | 'okx' | 'bingx'}) {

  const [formLoading, setFormLoading] = useState(false);

  async function handleSubmit (event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormLoading(true);
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const response: TokenFormType = await sendRequest(formData, `/accounts/${props.type}`)

    if (response.error) {
      addToast({
        title: response.error,
        color: "danger",
      });
    } else {
      addToast({
        title: 'Data saved successfully !',
        color: "success",
      });
    }
    setFormLoading(false);
  }

  return (
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
      {props.type === 'okx' &&
        <Input
          isRequired
          className="w-full lg:w-[49%]"
          classNames={{
            inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
          }}
          label="Passphrase"
          name="passphrase"
          type="text"
          variant="bordered"
        />
      }
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
  )
}
