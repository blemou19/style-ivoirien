const SUPABASE_URL = "https://shuzyobfytegnlyulgdj.supabase.co";
const SUPABASE_KEY = "sb_publishable_AHhrwdfio4wPM2kcUjdZ8w_DReukYdM";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const burger = document.querySelector('.burger');
const mainNav = document.getElementById('mainNav');

burger.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});
