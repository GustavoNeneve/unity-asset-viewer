import * as vscode from 'vscode';
import { strings, LocalizedStrings } from './strings';

type StringsCollection = {
    [K in 'en' | 'pt']: LocalizedStrings;
};

export class I18n {
    private static instance: I18n;
    private currentLanguage: 'en' | 'pt';
    private strings: LocalizedStrings;

    private constructor() {
        // Define o idioma baseado na configuração do VS Code
        this.currentLanguage = vscode.env.language.startsWith('pt') ? 'pt' : 'en';
        this.strings = (strings as StringsCollection)[this.currentLanguage];
    }

    public static getInstance(): I18n {
        if (!I18n.instance) {
            I18n.instance = new I18n();
        }
        return I18n.instance;
    }

    public getString(key: keyof LocalizedStrings, ...args: any[]): string {
        let text = this.strings[key] || strings.en[key]; // Fallback para inglês
        if (args.length > 0) {
            args.forEach((arg, index) => {
                text = text.replace(`{${index}}`, arg.toString());
            });
        }
        return text;
    }

    public setLanguage(language: 'en' | 'pt'): void {
        this.currentLanguage = language;
        this.strings = strings[language];
    }

    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }
}
