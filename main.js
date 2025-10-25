// Main application controller
class App {
    constructor() {
        this.currentTab = 'fermat';
        this.simulations = {};
        this.init();
    }

    init() {
        // Initialize tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        // Initialize simulations
        this.simulations.fermat = new FermatSimulation();
        this.simulations.mechanics = new MechanicsSimulation();
        this.simulations.quantum = new QuantumSimulation();

        // Start the active simulation
        this.simulations[this.currentTab].start();
    }

    switchTab(tabName) {
        // Stop current simulation
        if (this.simulations[this.currentTab]) {
            this.simulations[this.currentTab].stop();
        }

        // Update UI
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        // Update current tab and start new simulation
        this.currentTab = tabName;
        if (this.simulations[this.currentTab]) {
            this.simulations[this.currentTab].start();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
