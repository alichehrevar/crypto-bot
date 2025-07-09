import React, { FormEvent, useEffect, useState } from "react";
import { addToast, Input } from "@heroui/react";
import { Button } from "@heroui/button";

import { TokenFormType } from "@/types/profile/settings/tokenFormType";
import { sendRequest } from "@/actions/post";
import { getData } from "@/actions/get";
import { AccountResponse } from "@/types/profile/AccountType";

export default function TokenForm(props: {type: 'binance' | 'okx' | 'bingx' | 'bybit'}) {

  const [form, setForm] = useState({
    apiKey: "",
    secretKey: "",
    passphrase: "",
    permissions: [] as string[],
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    getAccountData()
      .then((accountData: AccountResponse) => {
        if (accountData.account) {
          setForm({
            apiKey: accountData.account.apiKey || "",
            secretKey: accountData.account.secretKey || "",
            passphrase: (accountData.account as any).passphrase || "",
            permissions: accountData.account.permissions || [],
          });
        }
      })
      .catch(() => {
        addToast({
          title: "Error getting account info",
          color: "danger",
        });
      })
  }, [props.type]);

  async function getAccountData () {
    return await getData(`/accounts/${props.type}`)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((f) => ({
        ...f,
        permissions: checked
          ? [...f.permissions, value]
          : f.permissions.filter((p) => p !== value),
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  async function handleSubmit (event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormLoading(true);
    const payload: Record<string, string | File> = {
      apiKey:  form.apiKey,
      secretKey: form.secretKey,
      // if OKX:
      passphrase: form.passphrase,
      // flatten the array
      permissions: JSON.stringify(form.permissions),
    };
    const response: TokenFormType = await sendRequest(payload, `/accounts/${props.type}`)

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
        value={form.apiKey}
        onChange={handleChange}
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
        value={form.secretKey}
        onChange={handleChange}
        variant="bordered"
      />
      {props.type === 'okx' &&
        <Input
          isRequired
          className="w-full"
          classNames={{
            inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
          }}
          value={form.passphrase}
          onChange={handleChange}
          label="Passphrase"
          name="passphrase"
          type="text"
          variant="bordered"
        />
      }
      <div className="flex w-full justify-end">
        <Button className="min-w-[100px]" color="primary" isLoading={formLoading} type="submit" variant="ghost">
          {!formLoading && <span>Connect</span>}
        </Button>
      </div>
    </form>
  )
}
