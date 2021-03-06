import { PaymentPage } from './../payment/payment';
import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { LoadingController, NavParams, AlertController, NavController } from 'ionic-angular';
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import { Device } from '@ionic-native/device';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFireDatabase, AngularFireObject } from 'angularfire2/database';
import 'rxjs/add/operator/filter';
import { WorkshopMapPage } from '../workshop-map/workshop-map';

declare var google: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage implements OnInit{

@ViewChild('map') mapElement: ElementRef;
	
	towRequestId: string;
	userId: string;
	userTow: string;

	map: any;
	autocompleteItems: any;
	autocomplete: any;
	GoogleAutocomplete: any;
	geocoder: any;
	markers = [];
	userMarker: any;
	workshopMarker: any;

	mapOpt : {
			enableHighAccuracy: true,
			timeout: 5000,
			maximumAge: 3000
	}

	ref = firebase.database().ref('geolocations/');
	
	towObjRef: AngularFireObject<any>;
	towObj: Observable<any>;

	userObjRef: AngularFireObject<any>;
	userObj: Observable<any>;

	towRequestRef: AngularFireObject<any>;
	towRequest: Observable<any>;

	isArrived = false;
	isCompleted = false;

	constructor(private ngZone: NgZone, private geolocation: Geolocation, private loadingCtrl: LoadingController,
				private device: Device, private afAuth: AngularFireAuth, private navParams: NavParams, private db: AngularFireDatabase,
				private alertCtrl: AlertController, private navCtrl: NavController) {
		this.towRequestId = this.navParams.get('towRequestId');
		this.userId = this.navParams.get('userId');

		//google autocomplete
		this.GoogleAutocomplete = new google.maps.places.AutocompleteService();
		this.autocomplete = { input: '' };
		this.autocompleteItems = [];

		//geocoder
		this.geocoder = new google.maps.Geocoder;

		//get tow user
		this.userTow = firebase.auth().currentUser.uid;
		if(this.userTow) {
			console.log(this.userTow);
			this.towObjRef = this.db.object('geolocations/'+this.userTow);
			this.towObj = this.towObjRef.valueChanges();
			this.getTowLocation();
		} else {
			console.log('error no uid');
		}

		// //get user
		this.userObjRef = this.db.object('geolocations/'+this.userId);
		this.userObj = this.userObjRef.valueChanges();
		
		//get tow request
		this.towRequestRef = this.db.object(`towRequest/${this.towRequestId}`);
    	this.towRequest = this.towRequestRef.valueChanges();
		

	}

	getTowLocation() {
		this.towObj.subscribe(response => {
			console.log('getTowLocation');
			this.deleteMarkers();
			let image = 'assets/imgs/truck-icon.png';
			let updatelocation = new google.maps.LatLng(response.latitude, response.longitude);
			this.addMarker(updatelocation,image);
			this.setMapOnAll(this.map);
		});
	}

	getUserLocation() {
		this.towRequest.subscribe(response => {
			console.log('getUserLocation', response.originLat, response.originLng);
			let image = 'assets/imgs/person-icon.png';
			let updatelocation = new google.maps.LatLng(response.originLat, response.originLng);
			this.userMarker = new google.maps.Marker({
				position: updatelocation,
				map: this.map,
				icon: image
			});
      		this.userMarker.setMap(this.map);
		});
	}

	getWorkshopLocation() {
		this.towRequest.subscribe(response => {
			console.log('getWorkshopLocation');
			//let image = 'assets/imgs/person-icon.png';
			let updatelocation = new google.maps.LatLng(response.destLat, response.destLng);
			this.map.panTo(updatelocation);
			this.workshopMarker = new google.maps.Marker({
				position: updatelocation,
				map: this.map
				//icon: image
			});
			this.workshopMarker.setMap(this.map);
		});
	}

	ngOnInit() {
		this.initMap();
		//this.getUserLocation();
	}

	initMap() {

		const loading = this.loadingCtrl.create({
			content: 'Please wait...'
		});

		loading.present();

		navigator.geolocation.getCurrentPosition(response => {
			loading.dismiss();
			let towLocation = new google.maps.LatLng(response.coords.latitude, response.coords.longitude);
			this.map = new google.maps.Map(this.mapElement.nativeElement, {
				zoom: 15,
				center: towLocation,
				disableDefaultUI: true
			});

			this.towRequest.subscribe(response => {
				console.log('getUserLocation', response.originLat, response.originLng);
				let image = 'assets/imgs/person-icon.png';
				let updatelocation = new google.maps.LatLng(response.originLat, response.originLng);
				this.userMarker = new google.maps.Marker({
					position: updatelocation,
					map: this.map,
					icon: image
				});
				  this.userMarker.setMap(this.map);
				  this.map.setCenter(updatelocation);
			});


			this.deleteMarkers();
			this.updateGeolocation(response.coords.latitude,response.coords.longitude);
			let image = 'assets/imgs/truck-icon.png';
			this.addMarker(towLocation, image);
			this.setMapOnAll(this.map);
		}, error => {
			loading.dismiss();
			this.initMapError(error);
		},
			this.mapOpt);

		let options = {
			frequency: 3000,
			enableHighAccuracy: true
		};

		let watch = this.geolocation.watchPosition(options);
		watch.filter((p: any) => p.code === undefined).subscribe((position: Geoposition) => {
			console.log('watchPosition', position);
			this.deleteMarkers();
			this.updateGeolocation(position.coords.latitude,position.coords.longitude);
			let updateTowLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			let image = 'assets/imgs/truck-icon.png';
			this.addMarker(updateTowLocation, image);
			this.setMapOnAll(this.map);
		});
	}

	initMapError(error) {
		console.log(error);
		this.initMap();
	}

	private addMarker(location, image) {
		console.log('addMarker')
		let marker = new google.maps.Marker({
			position: location,
			map: this.map,
			icon: image
		});
		this.markers.push(marker);
	}

	private setMapOnAll(map) {
		console.log('setMapOnAll')
		this.markers.forEach(marker => {
			marker.setMap(map);
		})
	}

	private clearMarkers() {
		console.log('clearMarkers');
		this.setMapOnAll(null);
	}

	private deleteMarkers() {
		this.clearMarkers();
		this.markers = [];
	}

	updateGeolocation(lat, lng) {
		console.log('updateGeolocation')
		firebase.database().ref(`geolocations/${this.userTow}`).set({
			latitude: lat,
			longitude: lng
		});
	}

	pickupCar() {
		//console.log('arrived');
		this.isArrived = true;
		const alertPickup = this.alertCtrl.create({
			title: "Pick up customer's vehicle",
			message: "confirm that you have pick up customer's vehicle?",
			buttons: [
			  {
				text: 'Yes',
				handler: () => {
				  this.towRequestRef.update({"status": "picked_up"});
				}
			  }
			]
		  });

		const alert = this.alertCtrl.create({
			title: 'Confirmation',
			message: "Confirm that you arrived at user's location?",
			buttons: [
				{
					text: 'Cancel',
					role: 'cancel'
				},
				{
					text: 'Yes',
					handler: () => {
						this.isArrived = true;
						this.getWorkshopLocation();
						this.towRequestRef.update({"status": "arrived_at_user"});
					}
				}

			]
		});
		
		alert.present();

		this.towRequest.subscribe(res => {
			if(res.status == "arrived_at_user") {
				setTimeout(()=> { alertPickup.present(); }, 3000);
				// alertPickup.present();
			}
		});
		
	}

	complete() {
		this.isCompleted = true;
		const alert = this.alertCtrl.create({
			title: 'Confirmation',
			message: "Confirm that you arrived at workshop location?",
			buttons: [
				{
					text: 'Cancel',
					role: 'cancel'
				},
				{
					text: 'Yes',
					handler: () => {
						this.isCompleted = true;
						this.towRequestRef.update({"status": "arrived_at_workshop"});
					}
				}

			]
		});
		alert.present();
		this.towRequest.subscribe(res => {
			if(res.status == "completed") {
				this.navCtrl.push(PaymentPage, {"key": this.towRequestId});
			}
		});

	}
  	
}

