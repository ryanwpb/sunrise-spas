import Vuex from 'vuex';
import Vuelidate from 'vuelidate';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { ApolloError } from 'apollo-client';
import EditProfileForm from '@/components/EditProfileForm.vue';
import ServerError from '@/components/ServerError.vue';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(Vuelidate);

function setInputValue(input, value) {
  input.setValue(value);
  input.trigger('change');
  input.trigger('blur');
}

describe('EditProfileForm.vue', () => {
  const originalUser = {
    email: 'willy.wonka@commercetools.com',
    firstName: 'Willy',
    lastName: 'Wonka',
  };

  const newUser = {
    email: 'hey@gmail.com',
    firstName: 'William',
    lastName: 'Wonkala',
  };

  let options;
  let actions;
  let getters;

  beforeEach(() => {
    actions = { updateCustomer: jest.fn() };
    getters = {
      user: () => originalUser,
    };
    options = {
      localVue,
      store: new Vuex.Store({
        modules: {
          user: {
            actions,
            getters,
          },
        },
      }),
      mocks: {
        $t: jest.fn(),
      },
    };
  });

  it('renders a vue instance', () => {
    expect(shallowMount(EditProfileForm, options).isVueInstance()).toBeTruthy();
  });

  it('builds a correct updateActions array', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    expect(wrapper.vm.updateActions).toEqual([
      { changeEmail: { email: originalUser.email } },
      { setFirstName: { firstName: originalUser.firstName } },
      { setLastName: { lastName: originalUser.lastName } },
    ]);

    setInputValue(wrapper.find('[data-test="edit-form-email"]'), newUser.email);
    setInputValue(wrapper.find('[data-test="edit-form-firstName"]'), newUser.firstName);
    setInputValue(wrapper.find('[data-test="edit-form-lastName"]'), newUser.lastName);
    expect(wrapper.vm.updateActions).toEqual([
      { changeEmail: { email: newUser.email } },
      { setFirstName: { firstName: newUser.firstName } },
      { setLastName: { lastName: newUser.lastName } },
    ]);
  });

  it('updates user info when one form field is valid', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    setInputValue(wrapper.find('[data-test="edit-form-firstName"]'), newUser.firstName);
    wrapper.vm.save();

    const expectedUpdateActions = [
      { changeEmail: { email: originalUser.email } },
      { setFirstName: { firstName: newUser.firstName } },
      { setLastName: { lastName: originalUser.lastName } },
    ];
    expect(actions.updateCustomer).toHaveBeenCalledWith(expect.anything(), expectedUpdateActions, undefined);
  });

  it('updates user info when form is valid', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    setInputValue(wrapper.find('[data-test="edit-form-firstName"]'), newUser.firstName);
    setInputValue(wrapper.find('[data-test="edit-form-email"]'), newUser.email);
    setInputValue(wrapper.find('[data-test="edit-form-lastName"]'), newUser.lastName);
    wrapper.vm.save();

    const expectedUpdateActions = [
      { changeEmail: { email: newUser.email } },
      { setFirstName: { firstName: newUser.firstName } },
      { setLastName: { lastName: newUser.lastName } },
    ];
    expect(actions.updateCustomer).toHaveBeenCalledWith(expect.anything(), expectedUpdateActions, undefined);
  });

  it('does not update customer info when form is invalid', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    setInputValue(wrapper.find('[data-test="edit-form-firstName"]'), '');
    wrapper.vm.save();
    expect(actions.updateCustomer).not.toHaveBeenCalled();
  });

  it('does not update customer info when form has not changed', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    wrapper.vm.save();
    expect(actions.updateCustomer).not.toHaveBeenCalled();
  });

  it('checks if any of form values have changed', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    expect(wrapper.vm.hasFormChanged).toBeFalsy();

    setInputValue(wrapper.find('[data-test="edit-form-email"]'), newUser.email);
    expect(wrapper.vm.hasFormChanged).toBeTruthy();

    setInputValue(wrapper.find('[data-test="edit-form-email"]'), originalUser.email);
    expect(wrapper.vm.hasFormChanged).toBeFalsy();
  });

  it('shows form error', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    expect(wrapper.find('[data-test="edit-form-email-errors"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test="edit-form-firstName-errors"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test="edit-form-lastName-errors"]').exists()).toBeFalsy();

    setInputValue(wrapper.find('[data-test="edit-form-email"]'), 'willy.gmail.com');
    expect(wrapper.find('[data-test="edit-form-email-errors"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test="edit-form-firstName-errors"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test="edit-form-lastName-errors"]').exists()).toBeFalsy();

    setInputValue(wrapper.find('[data-test="edit-form-email"]'), 'willy@gmail.com');
    expect(wrapper.find('[data-test="edit-form-email-errors"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test="edit-form-firstName-errors"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test="edit-form-lastName-errors"]').exists()).toBeFalsy();
  });

  it('catches server errors', () => {
    const wrapper = shallowMount(EditProfileForm, options);
    expect(wrapper.find(ServerError).props().error).toBeNull();

    const error = new ApolloError({
      graphQLErrors: [{ code: 'Error1' }, { code: 'Error2' }],
    });
    actions.updateCustomer.mockRejectedValue(error);
    setInputValue(wrapper.find('[data-test="edit-form-email"]'), newUser.email);
    setInputValue(wrapper.find('[data-test="edit-form-firstName"]'), newUser.firstName);
    setInputValue(wrapper.find('[data-test="edit-form-lastName"]'), newUser.lastName);
    wrapper.vm.save().then(() => {
      expect(wrapper.find(ServerError).props().error).toEqual(error);
    });
  });
});
