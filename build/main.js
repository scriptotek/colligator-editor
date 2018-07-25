'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Documents = Vue.resource('/colligator/api/documents{/id}', null, {
  saveCover: { method: 'POST', url: '/colligator/api/documents{/id}/cover' },
  saveDescription: { method: 'POST', url: '/colligator/api/documents{/id}/description' },
  cannotFindCover: { method: 'POST', url: '/colligator/api/documents{/id}/cannotFindCover' }
}, {
  before: function before(request) {
    if (Documents.previousRequest && Documents.previousRequest.method == 'GET') {
      Documents.previousRequest.abort();
    }
    Documents.previousRequest = request;
  }
}

// Since this is a simple app, we use a global state object rather than Vuex
);var GlobalState = new Vue({
  data: function data() {
    return {
      canEdit: false
    };
  }
});

// ---------------------------------------------------------------------------
// EditableCover.vue
// import Documents from 'Documents.vue'
// import GlobalState from 'GlobalState.vue'

var EditableCover = {
  template: '\n    <div>\n      <div v-if="canEdit">\n        <div v-if="!editMode">\n          Omslagsbilde:\n          <span v-if="doc.cover && doc.cover.cached">\n            <a v-if="doc.cover.url" :href="doc.cover.url" target="_blank">{{ doc.cover.url.length > 40 ? doc.cover.url.substr(0,40) + \'\u2026\' : doc.cover.url }}</a>\n            <button v-on:click="edit" class="btn btn-secondary btn-sm">Rediger omslagsbilde</button>\n          </span>\n          <span v-else>\n            <button v-on:click="edit" class="btn btn-outline-success btn-sm"> <i class="fa fa-heart" aria-hidden="true"></i> Legg til</button>\n          </span>\n          <span v-if="!doc.cover || !doc.cover.cached">\n            <button v-on:click="notFound" class="btn btn-outline-danger btn-sm"> <i class="fa fa-times" aria-hidden="true"></i> Jeg gir opp</button>\n            <span v-if="doc.cannot_find_cover">\n              {{ doc.cannot_find_cover }} person(er) ga opp \xE5 pr\xF8ve \xE5 finne omslagsbilde.\n            </span>\n          </span>\n        </div>\n        <form v-else v-on:submit.prevent="submit" class="form-inline">\n          <label :for="\'coverUrl\' + doc.id" class="mr-2">Omslagsbilde:</label>\n          <input type="text"\n            :id="\'coverUrl\' + doc.id"\n            class="col form-control form-control-sm mr-2"\n            v-model="url" placeholder="URL til omslagsbilde">\n          <div>\n            <span v-if="busy">\n              Lagrer\u2026\n            </span>\n            <span v-else>\n              <button type="button" class="btn btn-secondary btn-sm" v-on:click="cancel">Avbryt</button>\n              <button type="submit" class="btn btn-primary btn-sm">Lagre</button>\n            </span>\n          </div>\n          <div class="alert alert-danger" role="alert" v-if="errors && errors.length">\n            <div v-for="error in errors">{{ error }}</div>\n          </div>\n        </form>\n      </div>\n      <div v-else style="color:rgb(185, 185, 185); font-size:80%">\n        <em class="glyphicon glyphicon-lock"></em>\n        Du m\xE5 v\xE6re p\xE5 UiO-nett for \xE5 redigere\n      </div>\n    </div>\n  ',
  props: {
    doc: Object
  },
  computed: {
    canEdit: function canEdit() {
      return GlobalState.canEdit;
    }
  },
  data: function data() {
    return {
      url: '',
      busy: false,
      errors: [],
      editMode: false
    };
  },
  created: function created() {
    this.url = this.doc.cover ? this.doc.cover.url : '';
  },
  methods: {
    edit: function edit() {
      var _this = this;

      this.editMode = true;

      // Allow Vue to update the DOM before we focus
      setTimeout(function () {
        return document.getElementById('coverUrl' + _this.doc.id).focus();
      });
    },
    cancel: function cancel() {
      this.editMode = false;
      this.url = this.doc.cover ? this.doc.cover.url : '';
    },
    failed: function failed(response) {
      // error callback
      console.log(response);
      if (response.status === 401) {
        this.errors = ['Ingen tilgang: ' + response.body];
      } else {
        this.errors = ['Save failed because of network or server issues.'];
      }
      if (response.status === 422) {
        this.errors = Object.keys(response.body).map(function (k) {
          return response.body[k][0];
        });
        console.log(this.errors);
      }
      this.busy = false;
    },
    notFound: function notFound() {
      var _this2 = this;

      if (this.busy) {
        return;
      }
      this.busy = true;
      this.errors = [];
      Documents.cannotFindCover({ id: this.doc.id }, {}).then(function (response) {
        _this2.busy = false;
        if (response.body.result !== 'ok') {
          _this2.errors = [response.body.error];
          return;
        }
        _this2.doc.cannot_find_cover = response.body.cannot_find_cover;
      }, this.failed.bind(this));
    },
    submit: function submit() {
      var _this3 = this;

      if (this.busy) {
        return;
      }
      this.busy = true;
      this.errors = [];
      Documents.saveCover({ id: this.doc.id }, { url: this.url }).then(function (response) {
        _this3.busy = false;
        if (response.body.result !== 'ok') {
          _this3.errors = [response.body.error];
          return;
        }
        _this3.doc.cover = response.body.cover;
        _this3.editMode = false;
      }, this.failed.bind(this));
    }
  }

  // ---------------------------------------------------------------------------
  // EditableDescription.vue
  // import Documents from 'Documents.vue'
  // import GlobalState from 'GlobalState.vue'

};var EditableDescription = {
  template: '\n    <div>\n      <div v-if="canEdit">\n        <div v-if="!editMode">\n          <div v-if="doc.description && doc.description.text">\n            <button style="float:right" v-on:click="edit" class="btn btn-secondary btn-sm">Rediger beskrivelse</button>\n            <div style="font-style:italic; font-size:90%;" v-html="htmlText"></div>\n            <p style="font-size:70%; color:#888;">Kilde: {{ doc.description.source_url }}</p>\n          </div>\n          <span v-else>\n            <button v-on:click="edit" class="mt-2 mb-2 btn btn-outline-success btn-sm"> <i class="fa fa-heart" aria-hidden="true"></i> Legg til beskrivelse</button>\n          </span>\n        </div>\n        <form v-else v-on:submit.prevent="submit" class="mt-2">\n          <div class="form-group">\n            <label :for="\'descriptionText\' + doc.id">Beskrivelse:</label>\n          <textarea :id="\'descriptionText\' + doc.id"\n            class="form-control form-control-sm"\n            v-model="text" rows="8"></textarea>\n        </div>\n        <div class="form-group">\n            <label :for="\'descriptionSourceUrl\' + doc.id">Kilde:</label>\n            <input type="text" :id="\'descriptionSourceUrl\' + doc.id"\n              placeholder="URL til nettsiden du hentet beskrivelsen fra"\n              class="form-control form-control-sm col"\n              v-model="sourceUrl">\n              </div>\n          <span v-if="busy">\n            Lagrer\u2026\n          </span>\n          <span v-else>\n            <button type="button" class="btn btn-secondary btn-sm" v-on:click="cancel">Avbryt</button>\n            <button type="submit" class="btn btn-primary btn-sm">Lagre</button>\n          </span>\n          <div class="alert alert-danger" role="alert" v-if="errors && errors.length">\n            <div v-for="error in errors">{{ error }}</div>\n          </div>\n        </form>\n      </div>\n    </div>\n  ',
  props: {
    doc: Object
  },
  computed: {
    canEdit: function canEdit() {
      return GlobalState.canEdit;
    },
    htmlText: function htmlText() {
      return this.text.replace(/\n/g, '<br>');
    }
  },
  data: function data() {
    return {
      text: '',
      sourceUrl: '',
      busy: false,
      errors: [],
      editMode: false
    };
  },
  created: function created() {
    this.text = this.doc.description ? this.doc.description.text : '';
    this.sourceUrl = this.doc.description ? this.doc.description.source_url : '';
  },
  methods: {
    edit: function edit() {
      var _this4 = this;

      this.editMode = true;

      // Wait for Vue to update the DOM before we focus
      setTimeout(function () {
        return document.getElementById('descriptionText' + _this4.doc.id).focus();
      });
    },
    cancel: function cancel() {
      this.editMode = false;
      this.text = this.doc.description ? this.doc.description.text : '';
      this.sourceUrl = this.doc.description ? this.doc.description.source_url : '';
    },
    failed: function failed(response) {
      // error callback
      console.log(response);
      if (response.status === 401) {
        this.errors = ['Ingen tilgang: ' + response.body];
      } else {
        this.errors = ['Save failed because of network or server issues.'];
      }
      if (response.status === 422) {
        this.errors = Object.keys(response.body).map(function (k) {
          return response.body[k][0];
        });
        console.log(this.errors);
      }
      this.busy = false;
    },
    submit: function submit() {
      var _this5 = this;

      if (this.busy) {
        return;
      }
      this.busy = true;
      this.errors = [];
      Documents.saveDescription({ id: this.doc.id }, { text: this.text, source: 'editor', source_url: this.sourceUrl }).then(function (response) {
        _this5.busy = false;
        if (response.body.result !== 'ok') {
          _this5.errors = [response.body.error];
          return;
        }
        _this5.doc.description = response.body.description;
        _this5.editMode = false;
      }, this.failed.bind(this));
    }
  }

  // ---------------------------------------------------------------------------
  // Document.vue
  // import EditableCover from 'EditableCover.vue'

};var Document = {
  template: '\n    <li class="list-group-item">\n      <div style="width:100%">\n        <img v-if="doc.cover" :src="doc.cover.thumb.url" style="width: 100px;" />\n        <div style="flex: 1 1 auto;">\n          <h3>{{ doc.title }} <span style="color:#018D83">({{doc.year}})</span></h3>\n          <span style="background: #eee; border-radius:3px; padding:0 6px; margin-right:5px; font-size:85%; display:inline-block;" v-for="creator in doc.creators"> {{creator.normalizedName}} </span>\n\n          <editable-description :doc="doc"></editable-description>\n          <div class="mb-2" style="font-size:85%; color: #008">\n            ISBN: <span v-for="isbn in doc.isbns"> {{ isbn }} </span>\n            <div v-for="holding in localHoldings">\n              {{ holding.barcode }} :\n              {{ holding.callcode ? holding.callcode : \'(ikke stilt opp p\xE5 hylla enda)\' }}\n            </div>\n          </div>\n          <editable-cover :doc="doc"></editable-cover>\n        </div>\n      </div>\n    </li>\n  ',
  props: {
    doc: Object
  },
  computed: {
    localHoldings: function localHoldings() {
      return this.doc.holdings ? this.doc.holdings.filter(function (holding) {
        return holding.shelvinglocation === 'k00475';
      }) : [];
    }
  },
  components: {
    'editable-cover': EditableCover,
    'editable-description': EditableDescription
  }

  // ---------------------------------------------------------------------------
  // Search.vue
  // import GlobalState from 'GlobalState.vue'

};var Search = {
  template: '\n    <div>\n      <div>\n        S\xF8k med <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html">ElasticSearch query string syntax</a>:\n      </div>\n      <form v-on:submit.prevent="submitForm" class="form-inline no-gutters">\n        <div class="col-md-6">\n          <input v-model="query" class="form-control" style="width:100%;">\n        </div>\n        <div class="col-sm-6">\n          Sortering:\n          <select v-model="sort" class="form-control">\n            <option value="">(ingen sortering)</option>\n            <option value="year">utgivelses\xE5r</option>\n            <option value="holdings.callcodeSortable">hyllesignatur</option>\n            <option value="cover.created">dato for omslagsbilde</option>\n            <option value="created">dato for postopprettelse</option>\n          </select>\n          <select v-model="order" class="form-control">\n            <option value="asc">stigende</option>\n            <option value="desc">synkende</option>\n          </select>\n          <button type="submit" class="btn btn-primary">S\xF8k</button>\n        </div>\n      </form>\n      <p>\n        Du kan f.eks. s\xF8ke etter\n        <router-link :to="{ path: \'/search\', query: { q: \'collections:&quot;samling42&quot; AND NOT _exists_:cover AND cannot_find_cover:0\' }}">\n          dokumenter i 42-samlingen som mangler omslagsbilde\n        </router-link>\n        eller\n        <router-link :to="{ path: \'/search\', query: { q: \'cover.created:\' + today }}">\n          dokumenter som har f\xE5tt omslagsbilde i dag\n        </router-link>\n      </p>\n      <router-view></router-view>\n    </div>\n  ',
  created: function created() {
    console.log('Hello, Search created');
    this.getQueryString();
    this.checkIp();
  },
  watch: {
    // call again the method if the route changes
    '$route': function $route() {
      this.getQueryString();
    }
  },
  data: function data() {
    return {
      query: '',
      sort: '',
      order: 'asc',
      today: new Date().toISOString().substr(0, 10)
    };
  },
  methods: {
    submitForm: function submitForm() {
      this.$router.push({ path: '/search', query: {
          q: this.query,
          sort: this.sort == '' ? null : this.sort,
          order: this.sort == '' ? null : this.order
        } });
    },
    getQueryString: function getQueryString() {
      this.query = this.$route.query.q;
      this.sort = this.$route.query.sort;
      this.order = this.$route.query.order || 'asc';
    },
    checkIp: function checkIp() {
      this.$http.get('/colligator/api/ipcheck').then(function (response) {
        GlobalState.canEdit = true;
      }, function (response) {
        GlobalState.canEdit = false;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // SearchResults.vue
  // import Document from 'Document.vue'
  // import Documents from 'Documents.vue'

};var SearchResults = {
  template: '\n    <div>\n      <div v-show="!busy && !error">Got {{ documents.length }} of {{ totalResults }} results</div>\n      <div v-show="error" class="alert alert-danger">{{ error }}</div>\n      <ul class="list-group">\n        <document :doc="doc" v-for="doc in documents" :key="doc.id"></document>\n      </ul>\n      <div v-show="busy">Henter...</div>\n      <p class="mt-2">\n        <button v-on:click="more()" v-show="!busy && documents.length < totalResults" class="btn btn btn-outline-info">Hent flere</button>\n      </p>\n    </div>\n  ',
  created: function created() {
    console.log('Hello, SearchResults created');
    this.fetchResults();
  },
  watch: {
    // call again the method if the route changes
    '$route': function $route() {
      this.fetchResults();
    }
  },
  components: {
    'document': Document
  },
  data: function data() {
    return {
      documents: [],
      from: 0,
      totalResults: 0,
      busy: true,
      error: ''
    };
  },
  methods: {
    more: function more() {
      this.fetchResults(this.from);
    },
    fetchResults: function fetchResults(from) {
      var _this6 = this;

      if (!from) {
        from = 0;
        this.documents = [];
      }
      this.busy = true;
      console.log('Searching for: ' + this.$route.query.q);

      this.error = '';
      Documents.get({
        q: this.$route.query.q,
        offset: from,
        sort: this.$route.query.sort,
        order: this.$route.query.order
      }).then(function (response) {
        _this6.error = '';
        if (_typeof(response.body) != 'object') {
          _this6.error = 'Server returned non-JSON response';
          _this6.busy = false;
          return;
        }
        if (response.body.error) {
          _this6.error = response.body.error + ':' + response.body.error_message;
          _this6.busy = false;
          return;
        }
        response.body.documents.forEach(function (doc) {
          if (!doc.cannot_find_cover) {
            // Initialize with default value since Vue cannot detect property addition or deletion
            // https://vuejs.org/v2/guide/reactivity.html
            doc.cannot_find_cover = 0;
          }
          if (doc.description) {
            doc.description.text = doc.description.text.replace(/Ã¦/g, 'æ');
            doc.description.text = doc.description.text.replace(/Ã¥/g, 'å');
            doc.description.text = doc.description.text.replace(/Ã¸/g, 'ø');
          }
          _this6.documents.push(doc);
          _this6.from++;
        });
        _this6.totalResults = response.body.total;
        _this6.busy = false;
      }, function (response) {
        // error callback
        console.log(response);
        _this6.error = 'Beklager, det oppsto en feil';
        _this6.busy = false;
      });
    }
  }

  // ---------------------------------------------------------------------------

  // main.js
  // import Vue from 'vue'
  // import VueRouter from 'vue-router'
  // import Search from 'Search.vue'
  // import SearchResults from 'SearchResults.vue'

};var router = new VueRouter({
  routes: [{
    path: '/',
    component: Search,
    children: [{
      path: 'search',
      component: SearchResults
    }]
  }]
});

// mount a root Vue instance
new Vue({ router: router }).$mount('#app');