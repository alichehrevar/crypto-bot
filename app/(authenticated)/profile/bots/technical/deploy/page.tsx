'use client'

import BotConfigForm from "@/components/profile/bots/deploy/BotConfigForm";

/**
 * BotConfig represents the configuration data required to deploy a new bot.
 */
export interface BotConfig {
  name: string; // Bot name (e.g. "BTC/USDT 1h RSI Bot")
  symbol: string; // Trading pair (e.g. "BTC/USDT")
  baseFund: number; // Base fund in dollars.
  tradeFund: number; // Trade fund percentage.
  leverage: number; // Leverage factor.
  riskStrategy: string; // Money management strategy.
  compoundPositionSizing: boolean; // Use compound or simple position sizing.
  takeProfit: number; // Take profit multiplier.
  stopLoss: number; // Stop loss multiplier.
  indicator: string; // Primary indicator (e.g. "RSI", "MACD", etc.)
  timeframe: string; // Primary timeframe (e.g. "1h", "5m", etc.)
  additionalIndicators: Array<{ indicator: string; timeframe: string }>; // Additional indicator configurations.
  strategy: string; // Overall trading strategy (for now we set it equal to the indicator).
  strategyParams: object; // Configuration for the indicator (e.g. { period, overbought, oversold }).
}

/**
 * BotConfigFormProps defines the properties expected by the BotConfigForm component.
 */
interface BotConfigFormProps {
  onDeploy: (config: BotConfig) => void;
}

/**
 * BotConfigForm component
 *
 * Renders a form to deploy a new bot with configuration options.
 * It collects:
 *  - Bot Name
 *  - Symbol
 *  - Base Fund, Trade Fund, and Leverage
 *  - Risk Strategy and compound position sizing option
 *  - Take Profit and Stop Loss multipliers
 *  - Primary Indicator (with its timeframe) and additional indicators
 *  - Default strategy parameters are set based on the chosen primary indicator.
 */
export default function DeployBotPage () {

  // Handler for bot deployment.
  const handleBotDeploy = async (config: BotConfig) => {
    // try {
    //   const token = Cookies.get("token");
    //   const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    //   const res = await fetch(`${apiUrl}/bots/deploy`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       Authorization: `Bearer ${token}`,
    //     },
    //     body: JSON.stringify(config),
    //   });
    //   if (res.ok) {
    //     const data = await res.json();
    //     console.log('Bot deployed:', data);
    //     // Toggle refresh to re-fetch the deployed bots.
    //     setRefresh((prev) => !prev);
    //   } else {
    //     const errData = await res.json();
    //     setError(errData.error || 'Failed to deploy bot');
    //   }
    // } catch {
    //   setError('An unexpected error occurred while deploying the bot');
    // }
  };

  return (
    <BotConfigForm onDeploy={handleBotDeploy} />
  )
}
