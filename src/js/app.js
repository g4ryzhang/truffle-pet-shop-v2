App = {
    web3Provider: null,
    contracts: {},

    init: async function () {
        // Load pets.
        $.getJSON('../pets.json', function (data) {
            var petsRow = $('#petsRow');
            var petTemplate = $('#petTemplate');

            for (i = 0; i < data.length; i++) {
                petTemplate.find('.panel-title').text(data[i].name);
                petTemplate.find('img').attr('src', data[i].picture);
                petTemplate.find('.pet-breed').text(data[i].breed);
                petTemplate.find('.pet-age').text(data[i].age);
                petTemplate.find('.pet-location').text(data[i].location);
                petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

                petsRow.append(petTemplate.html());
            }
        });

        return await App.initWeb3();
    },

    initWeb3: async function () {
        // Modern dApp browsers
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request acc access
                await window.ethereum.request({ method: "eth_requestAccounts" });
            } catch (error) {
                // User denied acc access
                console.error("User denied account access.");
            }
        } else if (window.web3) {   // Legacy dApp browsers
            App.web3Provider = window.web3.currentProvider;
        } else {  // If no injected web3 instance is detected, fall back to Ganache
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost/7545')
        }
        web3 = new Web3(App.web3Provider);
        return App.initContract();
    },

    initContract: function () {
        $.getJSON('Adoption.json', function (data) {
            // Get the necessary contract artifact file and instantiate it with @truffle/contract
            const AdoptionArtifact = data;
            App.contracts.Adoption = TruffleContract(AdoptionArtifact);

            // Set the provider for our contract
            App.contracts.Adoption.setProvider(App.web3Provider);

            // Use our contract to retrieve and mark the adopted pets
            return App.markAdopted();
        });

        return App.bindEvents();
    },

    bindEvents: function () {
        $(document).on('click', '.btn-adopt', App.handleAdopt);
    },

    markAdopted: function () {
        let adoptionInstance;

        App.contracts.Adoption.deployed()
            .then(function (instance) {
                adoptionInstance = instance;
                return adoptionInstance.getAdopters.call();
            })
            .then(function(adopters) {
                adopters.forEach(function (adopter, i) {
                    if (adopter !== '0x0000000000000000000000000000000000000000') {  // Ethereum initializes the adopter array with 16 empty addresses
                        $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
                    }
                })
            })
            .catch(function (error) {
                console.log(error.message)
            });
    },

    handleAdopt: function (event) {
        event.preventDefault();

        const petId = parseInt($(event.target).data('id'));

        let adoptionInstance;

        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                console.log(error);
            }

            var account = accounts[0];

            App.contracts.Adoption.deployed().then(function (instance) {
                adoptionInstance = instance;

                // Execute adopt as a transaction by sending account
                return adoptionInstance.adopt(petId, { from: account });
            }).then(function (result) {
                return App.markAdopted();
            }).catch(function (err) {
                console.log(err.message);
            });
        });
    }

};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
