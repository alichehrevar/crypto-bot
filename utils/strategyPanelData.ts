import {DropdownOption} from "@/types/ui/DropdownOption";
import {RadioOption} from "@/types/ui/RadioOption";

export const STANDARD_INDICATOR_OPTIONS: DropdownOption[] = [
    {name: 'RSI', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'},
    {name: 'MACD', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'},
    {name: 'Bollinger Bands', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'},
    {name: 'EMA Cross', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'}
];
export const MAIN_INDICATOR_OPTIONS: DropdownOption[] = [
    {name: 'Chat-GPT', logo: 'https://img.icons8.com/?size=100&id=FBO05Dys9QCg&format=png&color=C1C1C1'},
    {name: 'Google Gemini', logo: 'https://img.icons8.com/?size=100&id=iBkBIBWE6tfT&format=png&color=000000'},
    {name: 'Grok', logo: 'https://img.icons8.com/?size=100&id=USGXKHXKl9X7&format=png&color=C1C1C1'},
    {name: '', logo: ''}, // Represents a separator
    ...STANDARD_INDICATOR_OPTIONS
];
export const TIME_FRAMES: DropdownOption[] = [
    {name: '1m'},
    {name: '5m'},
    {name: '15m'},
    {name: '1h'},
    {name: '4h'},
    {name: '1d'}];
export const OPTIMIZATION_METHODS: RadioOption[] = [
    {label: 'Genetic Algorithm', value: 'Genetic Algorithm'},
    {label: 'Grid Search', value: 'Grid Search'},
    {label: 'Bayesian', value: 'Bayesian'}
];
export const SIMULATED_TRADES_OPTIONS: DropdownOption[] = [
    {name: '5'},
    {name: '10'},
    {name: '15'},
    {name: '20'},
    {name: '25'},
    {name: '30'}];
export const OPTIMIZATION_ACCURACY_OPTIONS = [
    {name: '40%'},
    {name: '50%'},
    {name: '60%'},
    {name: '70%'},
    {name: '80%'},
    {name: '90%'}];
export const BOT_ACCURACY_OPTIONS = [
    {name: '40%'},
    {name: '50%'},
    {name: '60%'},
    {name: '70%'},
    {name: '80%'},
    {name: '90%'}];
export const ACCURACY_INTERVAL_OPTIONS = [
    {name: '30 min'},
    {name: '1 hour'},
    {name: '2 hour'},
    {name: '4 hour'},
    {name: '6 hour'},
    {name: '12 hour'},
    {name: '24 hour'}];
