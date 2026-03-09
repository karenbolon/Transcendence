<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>


<div class="min-h-screen bg-pong-darker text-gray-100">
	<div class="max-w-3xl mx-auto px-4 py-10">
	<h1 class="text-3xl font-bold tracking-tight">{$_('legal.privacy.title')}</h1>
	<p class="text-sm text-gray-400 mt-2">
		<em>{$_('legal.privacy.last_updated')}</em>
	</p>

	<hr class="my-8 border-white/10" />
	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.who_we_are.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.who_we_are.body')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.data_collect.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.data_collect.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li><strong>{$_('legal.privacy.data_collect.username_label')}</strong> — {$_('legal.privacy.data_collect.username_desc')}</li>
		<li><strong>{$_('legal.privacy.data_collect.email_label')}</strong> — {$_('legal.privacy.data_collect.email_desc')}</li>
	</ul>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.data_not_collect.title')}</h2>
	<p class="text-gray-200 leading-relaxed"><strong></strong></p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.privacy.data_not_collect.real_names')}</li>
		<li>{$_('legal.privacy.data_not_collect.payment')}</li>
		<li>{$_('legal.privacy.data_not_collect.location')}</li>
		<li>{$_('legal.privacy.data_not_collect.sensitive')}</li>
	</ul>
	<div class="my-8 h-px bg-white/5"></div>

 	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.legal_basis.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.legal_basis.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<strong>{$_('legal.privacy.legal_basis.contractual_title')}</strong>
			<ul class="list-disc pl-6 mt-1 space-y-1">
				<li>{$_('legal.privacy.legal_basis.contractual_item')}</li>
			</ul>
		<strong>{$_('legal.privacy.legal_basis.legit_title')}</strong>
			<ul class="list-disc pl-6 mt-1 space-y-1">
				<li>{$_('legal.privacy.legal_basis.legit_item')}</li>
			</ul>
	</ul>
	<div class="my-8 h-px bg-white/5"></div>		

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.use_data.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.use_data.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<li>{$_('legal.privacy.use_data.items.account')}</li>
		<li>{$_('legal.privacy.use_data.items.identify')}</li>
		<li>{$_('legal.privacy.use_data.items.participate')}</li>
		<li>{$_('legal.privacy.use_data.items.communicate')}</li>
		<li>{$_('legal.privacy.use_data.items.security')}</li>
	</ul>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.sharing.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.sharing.body')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.retention.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.retention.body')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.rights.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.rights.body')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.cookies.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.cookies.body')}</p>
	<div class="my-8 h-px bg-white/5"></div>

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.changes.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.changes.body')}</p>
	<hr class="my-8 border-white/10" />

	<h2 class="text-xl font-semibold mt-8 mb-2">{$_('legal.privacy.contact.title')}</h2>
	<p class="text-gray-200 leading-relaxed">{$_('legal.privacy.contact.intro')}</p>
	<ul class="list-disc pl-6 mt-2 space-y-1 text-gray-200">
		<a class="underline hover:no-underline" href="mailto:contact@pixiesthatridepinkponyunicorns.com">contact@pixiesthatridepinkponyunicorns.com</a>
	</ul>
</div>
</div>
