import React, { useState } from 'react';
import './Help.css';

const faqs = [
	{
		category: 'Getting started',
		question: 'How do I create an account or sign in?',
		steps: [
			'Choose Sign up to create an account, or Sign in if you already have one.',
			'Enter the requested information and use an email address you can access.',
			'Complete any email verification steps, then sign in with your credentials.',
			'If you forgot your password, select Forgot password on the sign-in page and follow the instructions.',
		],
	},
	{
		category: 'Applications',
		question: 'How do I start and submit an application?',
		steps: [
			'Sign in and select the required service from your dashboard.',
			'Read the eligibility information and document checklist before starting.',
			'Complete each section accurately. Save your progress if you need to continue later.',
			'Upload the requested documents and review the form for missing information.',
			'Submit the application and save the confirmation or reference number.',
		],
	},
	{
		category: 'Applications',
		question: 'How can I check my application status?',
		steps: [
			'Sign in and open Applications, My requests, or the equivalent dashboard section.',
			'Select the application using its reference number to see its current status.',
			'Check your dashboard and email for updates or requests for more information.',
		],
	},
	{
		category: 'Applications',
		question: 'Can I change an application after submitting it?',
		steps: [
			'Open the application in your dashboard and look for an edit or update option.',
			'If editing is unavailable, contact the service using the details on its page and provide your reference number.',
			'Avoid submitting a duplicate unless the service instructions specifically ask you to.',
		],
	},
	{
		category: 'Documents',
		question: 'What should I do if a document will not upload?',
		steps: [
			'Check the file type and size limits shown beside the upload field.',
			'Make sure the scan or photo is clear and contains every required page.',
			'Rename the file using simple letters and numbers, then try again.',
			'If it still fails, note the error message and contact support through the relevant service page.',
		],
	},
	{
		category: 'Appointments and payments',
		question: 'How do I manage an appointment or payment?',
		steps: [
			'Open the related application or service from your dashboard.',
			'Use the appointment or payment options provided and review details before confirming.',
			'Keep the confirmation or receipt. If a payment appears unsuccessful, check its status before trying again.',
		],
	},
	{
		category: 'Technical help',
		question: 'The site is not working. What can I try?',
		steps: [
			'Refresh the page and check your internet connection.',
			'Use an up-to-date browser, or clear the browser cache and sign in again.',
			'Check required fields and note any error message.',
			'If the issue continues, contact support using the relevant service page. Never send your password.',
		],
	},
];

export default function Help() {
	const [search, setSearch] = useState('');
	const [expanded, setExpanded] = useState(null);
	const query = search.trim().toLowerCase();
	const results = faqs.filter(({ category, question, steps }) =>
		`${category} ${question} ${steps.join(' ')}`.toLowerCase().includes(query),
	);

	return (
		<main className="help-page" style={styles.page}>
			<div style={styles.content}>
				<p className="help-eyebrow" style={styles.eyebrow}>SUPPORT</p>
				<h1 style={styles.heading}>Help and Frequently asked questions</h1>
				<p className="help-intro" style={styles.intro}>
					Find step-by-step guidance for using the services. Follow the instructions on each service
					page for specific requirements.
				</p>

				<label htmlFor="help-search" style={styles.label}>Search help topics</label>
				<input
					id="help-search"
					type="search"
					className="help-search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Try ‘application status’ or ‘upload’"
					style={styles.search}
				/>

				<section aria-label="Frequently asked questions" style={styles.faqList}>
					{results.map((faq) => {
						const isExpanded = expanded === faq.question;
						const answerId = `answer-${faqs.indexOf(faq)}`;
						return (
							<article key={faq.question} className="help-card" style={styles.card}>
								<p className="help-category" style={styles.category}>{faq.category}</p>
								<button
									type="button"
									aria-expanded={isExpanded}
									aria-controls={answerId}
									onClick={() => setExpanded(isExpanded ? null : faq.question)}
									className="help-question"
									style={styles.question}
								>
									<span>{faq.question}</span>
									<span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
								</button>
								{isExpanded && (
									<ol id={answerId} className="help-steps" style={styles.steps}>
										{faq.steps.map((step) => <li key={step}>{step}</li>)}
									</ol>
								)}
							</article>
						);
					})}
					{results.length === 0 && (
						<p role="status" className="help-no-results" style={styles.noResults}>No matching topics. Try another search.</p>
					)}
				</section>

				<aside className="help-contact" style={styles.contact}>
					<h2 style={styles.contactHeading}>Still need help?</h2>
					<p className="help-contact-text" style={styles.contactText}>
						Use the official contact options on the relevant service page. Include your application
						reference number when asking about a request, but never share your password.
					</p>
				</aside>
			</div>
		</main>
	);
}

const styles = {
	page: { minHeight: '100vh', boxSizing: 'border-box', padding: '48px 20px', background: '#f5f7fa', color: '#172b4d', fontFamily: 'Arial, sans-serif' },
	content: { width: '100%', maxWidth: '850px', margin: '0 auto' },
	eyebrow: { margin: '0 0 8px', color: '#526581', fontSize: '13px', fontWeight: 700, letterSpacing: '1px' },
	heading: { margin: '0 0 12px', fontSize: '32px', lineHeight: 1.2 },
	intro: { margin: '0 0 28px', color: '#526581', lineHeight: 1.6 },
	label: { display: 'block', marginBottom: '8px', fontWeight: 700 },
	search: { boxSizing: 'border-box', width: '100%', padding: '13px 14px', border: '1px solid #aebaca', borderRadius: '6px', background: '#fff', fontSize: '16px' },
	faqList: { display: 'grid', gap: '12px', marginTop: '22px' },
	card: { padding: '18px 20px', border: '1px solid #d5dce5', borderRadius: '8px', background: '#fff' },
	category: { margin: '0 0 7px', color: '#526581', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' },
	question: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: 0, border: 0, background: 'transparent', color: '#172b4d', textAlign: 'left', fontSize: '17px', fontWeight: 700, cursor: 'pointer' },
	steps: { margin: '14px 0 0', paddingLeft: '24px', color: '#344563', lineHeight: 1.65 },
	noResults: { padding: '18px', color: '#526581', textAlign: 'center' },
	contact: { marginTop: '26px', padding: '20px', borderLeft: '4px solid #0759a5', borderRadius: '4px', background: '#eaf2fa' },
	contactHeading: { margin: '0 0 8px', fontSize: '18px' },
	contactText: { margin: 0, color: '#344563', lineHeight: 1.6 },
};
