import { Button } from "@/components/ui/button";
import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-24 dark:bg-slate-950">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Get in touch
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            We’d love to hear from you. Whether you have a question about features, pricing, or need a demo, our team is ready to answer all your questions.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 text-center sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50">
             <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
             </div>
             <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Sales & Enterprise</h3>
             <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Interested in our Enterprise plan with custom integrations?
             </p>
             <p className="mt-4 font-semibold text-indigo-600 dark:text-indigo-400">sales@wallnet-sec.com</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900/50">
             <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
             </div>
             <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Technical Support</h3>
             <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                need help integrating or debugging your flow?
             </p>
             <p className="mt-4 font-semibold text-emerald-600 dark:text-emerald-400">support@wallnet-sec.com</p>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Send us a message</h2>
            <form className="mt-8 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="first-name" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">First name</label>
                        <input type="text" name="first-name" id="first-name" className="mt-2.5 block w-full rounded-md border-0 bg-slate-50 px-3.5 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:ring-slate-700 dark:text-white dark:focus:ring-indigo-500 sm:text-sm sm:leading-6" />
                    </div>
                    <div>
                        <label htmlFor="last-name" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">Last name</label>
                        <input type="text" name="last-name" id="last-name" className="mt-2.5 block w-full rounded-md border-0 bg-slate-50 px-3.5 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:ring-slate-700 dark:text-white dark:focus:ring-indigo-500 sm:text-sm sm:leading-6" />
                    </div>
                </div>
                <div>
                    <label htmlFor="company" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">Company</label>
                    <input type="text" name="company" id="company" className="mt-2.5 block w-full rounded-md border-0 bg-slate-50 px-3.5 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:ring-slate-700 dark:text-white dark:focus:ring-indigo-500 sm:text-sm sm:leading-6" />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">Email</label>
                    <input type="email" name="email" id="email" className="mt-2.5 block w-full rounded-md border-0 bg-slate-50 px-3.5 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:ring-slate-700 dark:text-white dark:focus:ring-indigo-500 sm:text-sm sm:leading-6" />
                </div>
                <div>
                    <label htmlFor="message" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">Message</label>
                    <textarea name="message" id="message" rows={4} className="mt-2.5 block w-full rounded-md border-0 bg-slate-50 px-3.5 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-900 dark:ring-slate-700 dark:text-white dark:focus:ring-indigo-500 sm:text-sm sm:leading-6" />
                </div>
                <div className="flex justify-start">
                    <Button type="submit" size="lg" className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">
                        Send Message
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}
