import { setupWorker } from 'msw/browser';
import handlers from "../components/Account/Account.mocks";
 
export const worker = setupWorker(...handlers)