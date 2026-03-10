<script>
    import { _, isLoading } from 'svelte-i18n';

</script>
<div class="min-h-screen bg-pong-darker text-gray-100">
	<div class="max-w-3xl mx-auto px-4 py-10">
	{#if !$isLoading}
		<h1 class="text-3xl font-bold tracking-tight">{$_('legal.terms.title')}</h1>
		<p class="text-sm text-gray-400 mt-2"><em>{$_('legal.terms.last_updated')}</em></p>

		<hr class="my-8 border-white/10" />
		<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.introduction.title')}</h2>
		<p class="text-gray-200 leading-relaxed">{$_('legal.terms.introduction.body')}</p>
		<div class="my-8 h-px bg-white/5"></div>

		<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.description.title')}</h2>
		<p class="text-gray-200 leading-relaxed">{$_('legal.terms.description.intro')}</p>
		<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
			<li>{$_('legal.terms.description.items.account')}</li>
			<li>{$_('legal.terms.description.items.login')}</li>
			<li>{$_('legal.terms.description.items.interact')}</li>
			<li>{$_('legal.terms.description.items.play')}</li>
			<li>{$_('legal.terms.description.items.realtime')}</li>
		</ul>
		<div class="my-8 h-px bg-white/5"></div>

		<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.eligibility.title')}</h2>
		<p class="text-gray-200 leading-relaxed">{$_('legal.terms.eligibility.intro')}</p>
		<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
			<li>{$_('legal.terms.eligibility.items.age')}</li>
			<li>{$_('legal.terms.eligibility.items.accurate')}</li>
		<li>{$_('legal.terms.eligibility.items.security')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.eligibility.note')}</p>
	<div class="my-8 h-px bg-white/5"></div>

 	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.accounts.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.accounts.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.accounts.items.accurate')}</li>
		<li>{$_('legal.terms.accounts.items.impersonate')}</li>
		<li>{$_('legal.terms.accounts.items.share')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.accounts.note')}</p>	
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.acceptable_use.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.acceptable_use.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.acceptable_use.items.illegal')}</li>
		<li>{$_('legal.terms.acceptable_use.items.harass')}</li>
		<li>{$_('legal.terms.acceptable_use.items.malicious')}</li>
		<li>{$_('legal.terms.acceptable_use.items.exploit')}</li>
		<li>{$_('legal.terms.acceptable_use.items.unauthorized')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.acceptable_use.note')}</p>

	<div class="my-8 h-px bg-white/5"></div>
	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.ugc.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.ugc.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.ugc.items.usernames')}</li>
		<li>{$_('legal.terms.ugc.items.profile')}</li>
		<li>{$_('legal.terms.ugc.items.chat')}</li>
		<li>{$_('legal.terms.ugc.items.ingame')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.ugc.prohibited_intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.ugc.prohibited.items.offensive')}</li>
		<li>{$_('legal.terms.ugc.prohibited.items.illegal')}</li>
		<li>{$_('legal.terms.ugc.prohibited.items.misleading')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.ugc.note')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.privacy.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.privacy.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.privacy.items.collect')}</li>
		<li>{$_('legal.terms.privacy.items.used')}</li>
		<li>{$_('legal.terms.privacy.items.rights')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.privacy.note')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.availability.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.availability.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.availability.items.continuous')}</li>
		<li>{$_('legal.terms.availability.items.error_free')}</li>
		<li>{$_('legal.terms.availability.items.preservation')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.availability.note')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.termination.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.termination.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.termination.items.violate')}</li>
		<li>{$_('legal.terms.termination.items.security')}</li>
		<li>{$_('legal.terms.termination.items.discontinued')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.termination.note')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.ip.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.ip.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.ip.items.owned')}</li>
		<li>{$_('legal.terms.ip.items.educational')}</li>
		<li>{$_('legal.terms.ip.items.commercial')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.ip.note')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.liability.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.liability.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.terms.liability.items.loss')}</li>
		<li>{$_('legal.terms.liability.items.behaviour')}</li>
		<li>{$_('legal.terms.liability.items.warranties')}</li>
	</ul>
	<p class="text-gray-200 leading-relaxed mt-4">{$_('legal.terms.liability.note')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.law.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.law.body')}</p>
	<hr class="my-8 border-white/10" />
	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.terms.contact.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.terms.contact.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<a class="underline hover:no-underline" href="mailto:contact@pixiesthatridepinkponyunicorns.com">contact@pixiesthatridepinkponyunicorns.com</a>
	</ul>
	{:else}
		<h1 class="text-3xl font-bold tracking-tight">Terms of Service</h1>
		<p class="text-sm text-gray-400 mt-2"><em>Loading...</em></p>
	{/if}
</div>
</div>
