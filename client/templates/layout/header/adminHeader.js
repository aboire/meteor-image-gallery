// display this header when admin logs in

Template.adminHeader.helpers({
	isActive: function (type) {
		var name = Router.current().route.getName();
		return (name === type) ? 'active' : '';
	}
});

Template.adminHeader.events({
	'click #navbar-admin li a:not(".dropdown-toggle")': function (e) {
		if( $('#navbar-admin').hasClass('in') ) {
			$(".navbar-admin .navbar-toggle").click();
		}
	}
});