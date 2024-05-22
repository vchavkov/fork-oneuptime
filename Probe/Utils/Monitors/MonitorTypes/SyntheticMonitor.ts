import ObjectID from 'Common/Types/ObjectID';
import logger from 'CommonServer/Utils/Logger';
import ScreenSizeType from 'Common/Types/Monitor/SyntheticMonitors/ScreenSizeType';
import BrowserType from 'Common/Types/Monitor/SyntheticMonitors/BrowserType';
import SyntheticMonitorResponse from 'Common/Types/Monitor/SyntheticMonitors/SyntheticMonitorResponse';
import VMRunner from 'CommonServer/Utils/VM/VMRunner';
import ReturnResult from 'Common/Types/IsolatedVM/ReturnResult';
import { Browser, firefox, webkit, chromium, Page } from 'playwright';
import BadDataException from 'Common/Types/Exception/BadDataException';

export interface SyntheticMonitorOptions {
    monitorId?: ObjectID | undefined;
    screenSizeTypes?: Array<ScreenSizeType> | undefined;
    browserTypes?: Array<BrowserType> | undefined;
    script: string;
}

export default class SyntheticMonitor {
    public static async execute(
        options: SyntheticMonitorOptions
    ): Promise<Array<SyntheticMonitorResponse> | null> {
        const results: Array<SyntheticMonitorResponse> = [];

        for (const browserType of options.browserTypes || []) {
            for (const screenSizeType of options.screenSizeTypes || []) {
                logger.debug(
                    `Running Synthetic Monitor: ${options?.monitorId?.toString()}, Screen Size: ${screenSizeType}, Browser: ${browserType}`
                );

                const result: SyntheticMonitorResponse | null =
                    await this.executeByBrowserAndScreenSize({
                        script: options.script,
                        browserType: browserType,
                        screenSizeType: screenSizeType,
                    });

                if (result) {
                    result.browserType = browserType;
                    result.screenSizeType = screenSizeType;
                    results.push(result);
                }
            }
        }

        return results;
    }

    private static async executeByBrowserAndScreenSize(options: {
        script: string;
        browserType: BrowserType;
        screenSizeType: ScreenSizeType;
    }): Promise<SyntheticMonitorResponse | null> {
        if (!options) {
            // this should never happen
            options = {
                script: '',
                browserType: BrowserType.Chromium,
                screenSizeType: ScreenSizeType.Desktop,
            };
        }

        const scriptResult: SyntheticMonitorResponse = {
            logMessages: [],
            scriptError: undefined,
            result: undefined,
            screenshots: [],
            executionTimeInMS: 0,
            browserType: options.browserType,
            screenSizeType: options.screenSizeType,
        };

        try {
            let result: ReturnResult | null = null;

            let pageAndBrowser: {
                page: Page;
                browser: Browser;
            } | null = null;

            try {
                const startTime: [number, number] = process.hrtime();

                pageAndBrowser = await SyntheticMonitor.getPageByBrowserType({
                    browserType: options.browserType,
                    screenSizeType: options.screenSizeType,
                });

                result = await VMRunner.runCodeInSandbox({
                    code: options.script,
                    options: {
                        timeout: 120000, // 2 minutes
                        args: {},
                        context: {
                            page: pageAndBrowser.page,
                            screenSizeType: options.screenSizeType,
                            browserType: options.browserType,
                        },
                    },
                });

                const endTime: [number, number] = process.hrtime(startTime);

                const executionTimeInMS: number =
                    (endTime[0] * 1000000000 + endTime[1]) / 1000000;

                scriptResult.executionTimeInMS = executionTimeInMS;

                scriptResult.logMessages = result.logMessages;

                scriptResult.screenshots =
                    result?.returnValue?.screenshots || [];

                scriptResult.result = result?.returnValue?.data;
            } catch (err) {
                logger.error(err);
                scriptResult.scriptError =
                    (err as Error)?.message || (err as Error).toString();
            }

            if (pageAndBrowser?.browser) {
                await pageAndBrowser.browser.close();
            }

            return scriptResult;
        } catch (err: unknown) {
            logger.error(err);
            scriptResult.scriptError =
                (err as Error)?.message || (err as Error).toString();
        }

        return scriptResult;
    }

    private static getViewportHeightAndWidth(options: {
        screenSizeType: ScreenSizeType;
    }): {
        height: number;
        width: number;
    } {
        let viewPortHeight: number = 0;
        let viewPortWidth: number = 0;

        switch (options.screenSizeType) {
            case ScreenSizeType.Desktop:
                viewPortHeight = 1080;
                viewPortWidth = 1920;
                break;
            case ScreenSizeType.Mobile:
                viewPortHeight = 640;
                viewPortWidth = 360;
                break;
            case ScreenSizeType.Tablet:
                viewPortHeight = 768;
                viewPortWidth = 1024;
                break;
            default:
                viewPortHeight = 1080;
                viewPortWidth = 1920;
                break;
        }

        return { height: viewPortHeight, width: viewPortWidth };
    }

    private static async getPageByBrowserType(data: {
        browserType: BrowserType;
        screenSizeType: ScreenSizeType;
    }): Promise<{
        page: Page;
        browser: Browser;
    }> {
        const viewport: {
            height: number;
            width: number;
        } = SyntheticMonitor.getViewportHeightAndWidth({
            screenSizeType: data.screenSizeType,
        });

        let page: Page | null = null;
        let browser: Browser | null = null;

        if (data.browserType === BrowserType.Chromium) {
            browser = await chromium.launch();
            page = await browser.newPage();
        }

        if (data.browserType === BrowserType.Firefox) {
            browser = await firefox.launch();
            page = await browser.newPage();
        }

        if (data.browserType === BrowserType.Webkit) {
            browser = await webkit.launch();
            page = await browser.newPage();
        }

        await page?.setViewportSize({
            width: viewport.width,
            height: viewport.height,
        });

        if (!browser) {
            throw new BadDataException('Invalid Browser Type.');
        }

        if (!page) {
            // close the browser if page is not created
            await browser.close();
            throw new BadDataException('Invalid Browser Type.');
        }

        return {
            page: page,
            browser: browser,
        };
    }
}